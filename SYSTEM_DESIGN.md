# System Design — Convertly

## Table of Contents

1. [Overview](#overview)
2. [High-Level Architecture](#high-level-architecture)
3. [AWS Services & Infrastructure](#aws-services--infrastructure)
4. [Feature 1: Reel Creator](#feature-1-reel-creator)
5. [Feature 2: Photo Set Magic](#feature-2-photo-set-magic)
6. [Feature 3: Ad Creator](#feature-3-ad-creator)
7. [Shared Modules](#shared-modules)
8. [Data Flow Summary](#data-flow-summary)
9. [Security Considerations](#security-considerations)

---

## Overview

Convertly is a Next.js 14 full-stack application that enables users to generate marketing content — video reels, AI-generated photo sets, and product ads — powered by AWS services (S3, Bedrock, Rekognition) and FFmpeg.

**Tech Stack:**

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Frontend | React 18, Tailwind CSS, TypeScript |
| Backend | Next.js API Routes (serverless functions) |
| AI — Image Generation | Amazon Bedrock (Titan Image Generator v2) |
| AI — Text Generation | Amazon Bedrock (Claude 3 Haiku) |
| AI — Image Analysis | Amazon Rekognition |
| Image Processing | Sharp |
| Video Processing | FFmpeg via fluent-ffmpeg |
| Storage | Amazon S3 (presigned URLs) |

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Browser (React)                     │
│  ┌───────────────┐ ┌────────────────┐ ┌──────────────┐  │
│  │ Reel Creator  │ │ Photo Set Magic│ │  Ad Creator  │  │
│  └──────┬────────┘ └───────┬────────┘ └──────┬───────┘  │
└─────────┼──────────────────┼─────────────────┼──────────┘
          │ fetch()          │ fetch()          │ fetch()
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────┐
│              Next.js API Routes (Node.js)               │
│                                                         │
│  /api/upload          /api/generate-images               │
│  /api/create-reel     /api/generate-ad                   │
│  /api/generate-text   /api/generate-ad-copy              │
│  /api/add-text-overlay /api/scrape-store                 │
│  /api/download-image                                     │
└────┬──────────┬──────────────┬───────────┬──────────────┘
     │          │              │           │
     ▼          ▼              ▼           ▼
 ┌───────┐ ┌────────┐  ┌───────────┐ ┌──────────┐
 │  S3   │ │ FFmpeg │  │  Bedrock  │ │Rekognition│
 │Bucket │ │(local) │  │Titan/Claude│ │  Labels  │
 └───────┘ └────────┘  └───────────┘ └──────────┘
```

**Request lifecycle:** Browser → API Route → AWS service / FFmpeg → S3 → Presigned URL → Browser

---

## AWS Services & Infrastructure

### Amazon S3

- Single bucket, configured via `AWS_S3_BUCKET_NAME`
- Key prefixes: `generated/`, `ads/`, `reels/`, `enhanced/`
- All reads served via presigned URLs (1-hour TTL)
- Shared client in `lib/s3.ts`

### Amazon Bedrock

| Model | Purpose | API Routes |
|-------|---------|------------|
| `amazon.titan-image-generator-v2:0` | Image generation, background removal | `/api/generate-images`, `/api/generate-ad` |
| `anthropic.claude-3-haiku-20240307-v1:0` | Text generation (ad copy, overlay suggestions) | `/api/generate-ad-copy`, `/api/generate-text` |

### Amazon Rekognition

- `DetectLabels` — analyzes uploaded images to determine object positions, safe text placement zones, and appropriate animation types
- Used in `/api/generate-text`

### FFmpeg

- Local binary (Homebrew → npm fallback)
- Used for text overlays on generated images and full video reel creation

---

## Feature 1: Reel Creator

### Purpose

Upload images, add AI-powered text overlays, and combine them into an MP4 video reel with transitions and motion effects.

### Component

`components/ReelCreator.tsx` — client component managing upload, selection, ordering, text editing, and reel playback.

### User Flow

```
Upload Images → Select & Order → (Optional) AI Text Overlay → Create Reel → Download/Play
```

### API Endpoints

#### POST `/api/upload`

Uploads images to S3.

```
Input:  multipart/form-data { files: File[] }
Output: { files: [{ fileName, s3Key, size, type, url }] }
```

**Processing:**
1. Parse FormData, extract image files
2. For each file: generate timestamped key, PutObject to S3
3. Return presigned URLs

#### POST `/api/generate-text`

Analyzes an image and generates text overlay suggestions.

```
Input:  { s3Key: string }
Output: { suggestions: string[], textPosition, animationType, detectedLabels }
```

**Processing:**
1. Rekognition `DetectLabels` on the S3 object (max 10 labels, 70% confidence)
2. Analyze bounding boxes → determine safe text position (`top` / `middle` / `bottom`)
3. Map detected labels → animation type:
   - Vehicles → `pan_right`
   - Landscapes → `ken_burns`
   - Food/drinks → `zoom_in_slow`
   - People/animals → `zoom_in_center`
   - Default → `zoom_in`
4. Send labels to Claude 3 Haiku → get 3 short overlay text suggestions
5. Return suggestions + position + animation type

#### POST `/api/create-reel`

Combines images into an MP4 video.

```
Input:  { images: [{ s3Key, overlayText?, textPosition?, animationType? }], transitionDuration }
Output: { videoUrl, videoKey }
```

**Processing:**
1. Validate: 2–20 images, transition 0.5–3s
2. Download all images from S3 to temp directory
3. Build FFmpeg filter graph:
   - Scale each image to 1080×1920 (9:16 portrait)
   - Apply per-image motion (zoompan with animation type)
   - Render text overlays via `drawtext` + semi-transparent `drawbox` backdrop
   - Chain images with `xfade=transition=fade`
4. Encode H.264, CRF 23, 30fps
5. Upload MP4 to S3 (`reels/` prefix)
6. Cleanup temp files, return presigned URL

**FFmpeg Filter Graph (simplified):**

```
[0:v] scale+crop → zoompan → drawbox+drawtext → [v0]
[1:v] scale+crop → zoompan → drawbox+drawtext → [v1]
...
[v0][v1] xfade=fade → [tmp0]
[tmp0][v2] xfade=fade → [out]
```

#### POST `/api/add-text-overlay`

Standalone endpoint: adds text + motion to a single image, outputs MP4.

```
Input:  { s3Key, text, motionEffect?, duration? }
Output: { videoUrl, videoKey }
```

### State Management (Client)

| State | Type | Purpose |
|-------|------|---------|
| `uploadedFiles` | `UploadedFile[]` | All uploaded images |
| `selectedForReel` | `Set<number>` | Indices selected for reel |
| `reelOrder` | `number[]` | Ordered sequence |
| `imageTexts` | `{[index]: string}` | Text overlays per image |
| `textPositions` | `{[index]: string}` | Position per image |
| `animationTypes` | `{[index]: string}` | Motion type per image |
| `aiSuggestions` | `{[index]: string[]}` | AI suggestions per image |
| `createdReels` | `CreatedReel[]` | Generated videos |

---

## Feature 2: Photo Set Magic

### Purpose

Generate a 7-slide AI photo set from a product/theme description. Each slide has a distinct marketing purpose (hook, story, how-to, impact, vibe, social proof, CTA).

### Component

`components/PhotoSetGenerator.tsx` — client component for prompt input, sequential generation, per-slide editing, and reel creation from slides.

### Configuration

`config/photo-set.config.ts` — defines 7 `SlideConfig` entries:

| # | ID | Purpose | Visual Style |
|---|-----|---------|-------------|
| 1 | `hook` | Attention grabber | Sunlit product photo, warm tones |
| 2 | `taste_journey` | Feature highlights | Infographic-style illustration |
| 3 | `blueprint` | How to enjoy | Top-down flat lay |
| 4 | `impact` | Emotional connection | Dog in cozy home |
| 5 | `vibe` | Lifestyle mood | Cozy ambient setting |
| 6 | `social_proof` | Customer testimonial | Person enjoying product |
| 7 | `cta` | Call to action | Hand reaching for product |

Each config provides: `visualPrompt(product)`, `headline(product)`, `bodyText(product)`, optional `footer(product)`.

### User Flow

```
Enter Product Name → Generate 7 Slides (sequential) → Edit/Regenerate Individual → Download All / Create Reel
```

### API Endpoint

#### POST `/api/generate-images`

Generates a single slide image with text overlay.

```
Input:  { prompt: string, regenerateIndex: number, customPrompt?, headline? }
Output: { image: { url, s3Key, theme, prompt, headline, bodyText, footer? } }
```

**Processing:**
1. Look up `PHOTO_SET_CONFIG[regenerateIndex]`
2. Build visual prompt from config (or use `customPrompt` for regeneration)
3. Call Bedrock Titan Image Generator v2:
   - 1024×1024, CFG scale 8.0
   - Returns base64 image
4. Add headline text overlay via FFmpeg:
   - Word-wrap to ~30 chars/line (max 3 lines)
   - Semi-transparent black box at bottom
   - White text with drop shadow
5. Upload to S3 (`generated/` prefix)
6. Return presigned URL + metadata

**Sequential Generation:** The client calls this endpoint 7 times in a loop (index 0–6), updating the UI after each response. This gives progressive feedback rather than waiting for all 7.

### Regeneration Flow

1. User clicks "Modify" on a slide
2. Edit form shows current visual prompt + headline
3. User modifies and clicks "Regenerate"
4. Same `/api/generate-images` endpoint called with `customPrompt` and `headline` overrides

### Reel from Slides

Reuses `/api/create-reel` — passes all 7 slide S3 keys to create a video reel.

---

## Feature 3: Ad Creator

### Purpose

Scrape a Shopify store, select a product, generate AI ad copy, and composite a professional ad image with AI background + product photo + text.

### Component

`components/AdCreator.tsx` — client component for store scraping, product selection, template picking, copy editing, and ad generation.

### User Flow

```
Paste Shopify URL → Scan Store → Select Product → Auto-generate Ad Copy → Pick Template → Adjust Options → Generate Ad Image → Download
```

### Templates

| ID | Style | Layout | Accent Color |
|----|-------|--------|-------------|
| `product-showcase` | Clean studio | Center | `#7c3aed` (violet) |
| `sale-banner` | Bold promotional | Left | `#dc2626` (red) |
| `lifestyle` | Aspirational | Right | `#059669` (green) |
| `minimal` | White/clean | Center | `#111827` (dark) |

### API Endpoints

#### POST `/api/scrape-store`

Fetches products from a Shopify store.

```
Input:  { url: string }
Output: { storeName, productCount, products: ScrapedProduct[] }
```

**Processing:**
1. Normalize URL → `https://{host}`
2. Fetch `{baseUrl}/products.json?limit=100`
3. Map each product: extract title, description (strip HTML), price, compareAtPrice, images, vendor, tags, handle
4. Return structured product array

#### POST `/api/generate-ad-copy`

Generates ad copy using Claude.

```
Input:  { product: ScrapedProduct, template: string }
Output: { adCopy: { headline, subheadline, cta, description } }
```

**Processing:**
1. Build prompt with product details + template style
2. Call Claude 3 Haiku (max 300 tokens)
3. Parse JSON from response
4. Return structured ad copy

#### POST `/api/generate-ad`

Composites the final ad image.

```
Input:  { product, adCopy, template, removeBg?, removePrice?, productScale? }
Output: { image: { url, s3Key, template } }
```

**Processing:**
1. **Generate AI background** — Titan Image Generator with template-specific prompt (1024×1024)
2. **Fetch product image** — download from Shopify CDN
3. **Optional background removal** — Titan `BACKGROUND_REMOVAL` task
4. **Resize product** — Sharp, `baseSize × productScale` (clamped to canvas), contain fit with transparency
5. **Position product** — layout-dependent placement (center/left/right), shifted when bg removed
6. **Build text SVG** — headline, subheadline, price (with strikethrough for compare-at), CTA button with accent color, drop shadow filter
7. **Create drop shadow** — tint product to black, blur, composite behind product
8. **Composite layers** — Sharp composite: background → shadow → product → text SVG
9. **Upload** to S3 (`ads/` prefix), return presigned URL

**Compositing Layer Order:**

```
┌─────────────────────┐
│   Text SVG (top)    │  ← headline, subheadline, price, CTA button
│   Product Image     │  ← resized, optionally bg-removed
│   Drop Shadow       │  ← blurred black silhouette offset by (6,8)px
│   AI Background     │  ← template-specific generated scene
└─────────────────────┘
```

### Client Options

| Option | Default | Range | Effect |
|--------|---------|-------|--------|
| Remove Background | `false` | toggle | Bedrock background removal on product |
| Remove Price | `true` | toggle | Hides price from ad text |
| Product Scale | `2.5x` | 1.5–3.5 | Product image size multiplier |

---

## Shared Modules

### `lib/s3.ts`

- `s3Client` — configured S3Client instance
- `BUCKET_NAME` — from env
- `getPresignedUrl(key, expiresIn=3600)` — generates read URLs

### `components/Navbar.tsx`

Tab-based navigation across the 3 features. Fixed top bar with logo, tab switcher, and CTA button.

### `app/page.tsx`

Root page — renders all 3 feature components, toggles visibility via `activeTab` state. Uses CSS `hidden` class (not conditional rendering) to preserve component state across tab switches.

### `app/api/download-image/route.ts`

Proxy download endpoint — fetches from S3 and returns with `Content-Disposition: attachment` header.

---

## Data Flow Summary

```
Feature 1 (Reel Creator):
  Browser → /api/upload → S3
  Browser → /api/generate-text → Rekognition + Bedrock Claude → Browser
  Browser → /api/create-reel → S3 (download) → FFmpeg → S3 (upload) → Browser

Feature 2 (Photo Set Magic):
  Browser → /api/generate-images (×7) → Bedrock Titan → FFmpeg (text) → S3 → Browser
  Browser → /api/create-reel → S3 → FFmpeg → S3 → Browser

Feature 3 (Ad Creator):
  Browser → /api/scrape-store → Shopify API → Browser
  Browser → /api/generate-ad-copy → Bedrock Claude → Browser
  Browser → /api/generate-ad → Bedrock Titan + Shopify CDN + Sharp → S3 → Browser
```

---

## Security Considerations

- AWS credentials stored in `.env.local`, never committed (in `.gitignore`)
- All S3 access via presigned URLs with 1-hour expiry
- No direct S3 bucket exposure to the client
- Input validation on all API routes (required fields, array bounds, numeric ranges)
- HTML stripped from scraped product descriptions
- FFmpeg text inputs escaped for shell safety
- Temp files cleaned up in `finally` blocks on both success and error paths
