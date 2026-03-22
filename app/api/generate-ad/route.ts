import { NextRequest, NextResponse } from 'next/server';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, BUCKET_NAME, getPresignedUrl } from '@/lib/s3';
import sharp from 'sharp';

const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const TEMPLATES: Record<string, { bgPrompt: (product: string) => string; layout: 'center' | 'left' | 'right'; accent: string }> = {
  'product-showcase': {
    bgPrompt: (p) => `Clean elegant background setting perfect for displaying ${p}, soft complementary tones, studio lighting, professional product ad backdrop, no text no words no letters`,
    layout: 'center',
    accent: '#7c3aed',
  },
  'sale-banner': {
    bgPrompt: (p) => `Bold vibrant background themed around ${p}, energetic colors related to the product category, dynamic promotional feel, abstract shapes, no text no words no letters`,
    layout: 'left',
    accent: '#dc2626',
  },
  'lifestyle': {
    bgPrompt: (p) => `Beautiful lifestyle scene where someone would use ${p}, realistic setting, warm natural lighting, aspirational mood, slightly blurred background, no text no words no letters`,
    layout: 'right',
    accent: '#059669',
  },
  'minimal': {
    bgPrompt: (p) => `Pure clean background with subtle tones that complement ${p}, minimalist setting, soft diffused light, no text no words no letters`,
    layout: 'center',
    accent: '#111827',
  },
};

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

async function generateBackground(prompt: string): Promise<Buffer> {
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
  const body = JSON.parse(new TextDecoder().decode(response.body));
  return Buffer.from(body.images[0], 'base64');
}

async function fetchProductImage(imageUrl: string): Promise<Buffer> {
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`Failed to fetch product image: ${res.status}`);
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.startsWith('image/')) throw new Error('URL did not return an image');
  return Buffer.from(await res.arrayBuffer());
}

function wrapText(text: string, maxWidth: number, fontSize: number): string[] {
  const charsPerLine = Math.floor(maxWidth / (fontSize * 0.55));
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if (current && (current + ' ' + word).length > charsPerLine) {
      lines.push(current);
      current = word;
    } else {
      current = current ? current + ' ' + word : word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function buildTextSvg(
  headline: string,
  subheadline: string,
  cta: string,
  price: string,
  compareAtPrice: string | null,
  accent: string,
  layout: 'center' | 'left' | 'right'
): Buffer {
  const w = 1024;
  const align = layout === 'center' ? 'middle' : layout === 'left' ? 'start' : 'end';
  const x = layout === 'center' ? w / 2 : layout === 'left' ? 80 : w - 80;

  const headlineLines = wrapText(headline, layout === 'center' ? 800 : 500, 52);
  const subLines = wrapText(subheadline, layout === 'center' ? 700 : 450, 28);

  let textY = layout === 'center' ? 680 : 520;

  const headlineSvg = headlineLines.map((line, i) => {
    const esc = line.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    return `<text x="${x}" y="${textY + i * 58}" font-family="Arial,Helvetica,sans-serif" font-size="52" font-weight="bold" fill="white" text-anchor="${align}" filter="url(#shadow)">${esc}</text>`;
  }).join('');
  textY += headlineLines.length * 58 + 12;

  const subSvg = subLines.map((line, i) => {
    const esc = line.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    return `<text x="${x}" y="${textY + i * 34}" font-family="Arial,Helvetica,sans-serif" font-size="26" fill="white" fill-opacity="0.9" text-anchor="${align}" filter="url(#shadow)">${esc}</text>`;
  }).join('');
  textY += subLines.length * 34 + 24;

  // Price
  const priceText = compareAtPrice
    ? `<text x="${x}" y="${textY}" font-family="Arial,Helvetica,sans-serif" font-size="22" fill="white" fill-opacity="0.5" text-anchor="${align}" text-decoration="line-through">$${compareAtPrice}</text>
       <text x="${x + (layout === 'center' ? 60 : layout === 'left' ? 80 : -80)}" y="${textY}" font-family="Arial,Helvetica,sans-serif" font-size="32" font-weight="bold" fill="${accent}" text-anchor="${align}">$${price}</text>`
    : `<text x="${x}" y="${textY}" font-family="Arial,Helvetica,sans-serif" font-size="32" font-weight="bold" fill="white" text-anchor="${align}">$${price}</text>`;
  textY += 48;

  // CTA button
  const ctaW = cta.length * 16 + 48;
  const ctaX = layout === 'center' ? (w - ctaW) / 2 : layout === 'left' ? 60 : w - ctaW - 60;
  const ctaSvg = `
    <rect x="${ctaX}" y="${textY}" width="${ctaW}" height="48" rx="24" fill="${accent}" />
    <text x="${ctaX + ctaW / 2}" y="${textY + 32}" font-family="Arial,Helvetica,sans-serif" font-size="20" font-weight="bold" fill="white" text-anchor="middle">${cta.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text>
  `;

  return Buffer.from(`<svg width="${w}" height="1024" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
        <feDropShadow dx="1" dy="1" stdDeviation="3" flood-color="black" flood-opacity="0.7" />
      </filter>
    </defs>
    ${headlineSvg}${subSvg}${priceText}${ctaSvg}
  </svg>`);
}

export async function POST(request: NextRequest) {
  try {
    const { product, adCopy, template } = await request.json();
    if (!product || !adCopy) return NextResponse.json({ error: 'Product and ad copy required' }, { status: 400 });

    const tmpl = TEMPLATES[template] || TEMPLATES['product-showcase'];

    // Generate AI background using product context
    const productContext = `${product.title}${product.productType ? ' (' + product.productType + ')' : ''}`;
    const bgBuffer = await generateBackground(tmpl.bgPrompt(productContext));

    // Fetch and resize product image
    const productImgRaw = await fetchProductImage(product.image);
    const productSize = tmpl.layout === 'center' ? 420 : 380;
    const productImg = await sharp(productImgRaw)
      .resize(productSize, productSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    // Position product image based on layout
    const productPos = {
      center: { left: Math.round((1024 - productSize) / 2), top: 120 },
      left: { left: 520, top: 160 },
      right: { left: 80, top: 160 },
    }[tmpl.layout];

    // Build text overlay SVG
    const textSvg = buildTextSvg(
      adCopy.headline, adCopy.subheadline, adCopy.cta,
      product.price, product.compareAtPrice, tmpl.accent, tmpl.layout
    );

    // Composite everything
    const finalImage = await sharp(bgBuffer)
      .composite([
        { input: productImg, ...productPos },
        { input: textSvg, top: 0, left: 0 },
      ])
      .png()
      .toBuffer();

    // Upload to S3
    const s3Key = `ads/${generateId()}-${template}.png`;
    await s3Client.send(new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: finalImage,
      ContentType: 'image/png',
    }));
    const url = await getPresignedUrl(s3Key);

    return NextResponse.json({ success: true, image: { url, s3Key, template } });
  } catch (error) {
    console.error('Ad generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate ad', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
