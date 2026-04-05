import { NextRequest, NextResponse } from 'next/server';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, BUCKET_NAME, getPresignedUrl } from '@/lib/s3';
import { withMeter } from '@/lib/meter';
import { getAWSConfig } from '@/lib/aws-config';
import sharp from 'sharp';

const bedrockClient = new BedrockRuntimeClient(getAWSConfig());

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

async function generateImage(prompt: string): Promise<Buffer> {
  const command = new InvokeModelCommand({
    modelId: 'amazon.titan-image-generator-v2:0',
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      taskType: 'TEXT_IMAGE',
      textToImageParams: { text: prompt },
      imageGenerationConfig: { numberOfImages: 1, height: 1024, width: 1024, cfgScale: 8.0 },
    }),
  });
  const response = await bedrockClient.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  return Buffer.from(responseBody.images[0], 'base64');
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if (current && (current + ' ' + word).length > maxChars) {
      lines.push(current);
      current = word;
    } else {
      current = current ? current + ' ' + word : word;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 3);
}

async function addTextOverlay(imageBuffer: Buffer, caption: string): Promise<Buffer> {
  const w = 1024;
  const fontSize = 48;
  const lineHeight = fontSize + 14;
  const padding = 24;
  const lines = wrapText(caption, 28);
  const textBlockH = lines.length * lineHeight;
  const boxH = textBlockH + padding * 2;
  const boxW = 920;
  const boxX = (w - boxW) / 2;
  const boxY = w - boxH - 50;

  // Detect brightness of overlay region
  const stats = await sharp(imageBuffer)
    .extract({ left: Math.round(boxX), top: boxY, width: boxW, height: Math.min(boxH, w - boxY) })
    .stats();
  const avg = (stats.channels[0].mean + stats.channels[1].mean + stats.channels[2].mean) / 3;
  const textColor = avg > 140 ? '#1e1b4b' : '#ffffff';

  const textLines = lines.map((line, i) => {
    const esc = line.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const y = boxY + padding + i * lineHeight + fontSize;
    return `<text x="${w / 2}" y="${y}" font-family="Arial,Helvetica,sans-serif" font-size="${fontSize}" font-weight="bold" fill="${textColor}" text-anchor="middle" filter="url(#shadow)">${esc}</text>`;
  }).join('');

  const svg = Buffer.from(`<svg width="${w}" height="${w}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="${avg > 140 ? 'white' : 'black'}" flood-opacity="0.7"/>
      </filter>
    </defs>
    <rect x="${boxX}" y="${boxY}" width="${boxW}" height="${boxH}" rx="16" fill="black" fill-opacity="0.4"/>
    ${textLines}
  </svg>`);

  return sharp(imageBuffer)
    .composite([{ input: svg, top: 0, left: 0 }])
    .png()
    .toBuffer();
}

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const requestBody = await request.json();
  // Only meter image generation calls, not the planning step
  if (requestBody.slides) {
    return withMeter(request, 'generate-theme-slides', () => handleThemeSlide(requestBody));
  }
  return handleThemeSlide(requestBody);
}

async function handleThemeSlide(requestBody: any) {
  try {
    const { theme, slideIndex, slides } = requestBody;
    if (!theme) return NextResponse.json({ error: 'Theme is required' }, { status: 400 });

    // If slides not provided, use Claude to plan them
    if (!slides) {
      const planPrompt = `You are a content creator. For the theme "${theme}", generate exactly 5 slides for a social media carousel.

Return ONLY valid JSON array, no markdown:
[
  {"title": "the actual real name (e.g. 'Grand Canyon', 'Saturn', 'Great Wall of China')", "imagePrompt": "detailed visual description for AI image generation, photorealistic, no text no words no letters"},
  ...
]

IMPORTANT: Use the real, specific names for each item (actual place names, planet names, landmark names, etc). Do NOT use generic titles. Image prompts should be vivid and specific.`;

      const command = new InvokeModelCommand({
        modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: 600,
          messages: [{ role: 'user', content: planPrompt }],
        }),
      });
      const response = await bedrockClient.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      const text = responseBody.content[0].text;
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('Failed to parse slide plan');
      const planned = JSON.parse(jsonMatch[0]);

      return NextResponse.json({ success: true, slides: planned });
    }

    // Generate a single slide image
    const idx = slideIndex ?? 0;
    const slide = slides[idx];
    if (!slide) return NextResponse.json({ error: 'Invalid slide index' }, { status: 400 });

    let imageBuffer = await generateImage(slide.imagePrompt);
    imageBuffer = await addTextOverlay(imageBuffer, slide.title);

    const s3Key = `themes/${generateId()}-slide${idx}.png`;
    await s3Client.send(new PutObjectCommand({
      Bucket: BUCKET_NAME, Key: s3Key, Body: imageBuffer, ContentType: 'image/png',
    }));
    const url = await getPresignedUrl(s3Key);

    return NextResponse.json({
      success: true,
      image: { url, s3Key, title: slide.title, prompt: slide.imagePrompt },
    });
  } catch (error) {
    console.error('Theme slide error:', error);
    return NextResponse.json(
      { error: 'Failed to generate slide', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
