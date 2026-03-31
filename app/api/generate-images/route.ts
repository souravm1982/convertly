import { NextRequest, NextResponse } from 'next/server';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, BUCKET_NAME, getPresignedUrl } from '@/lib/s3';
import { PHOTO_SET_CONFIG } from '@/config/photo-set.config';
import { withMeter } from '@/lib/meter';
import sharp from 'sharp';

const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

async function generateImage(prompt: string): Promise<Buffer> {
  const payload = {
    taskType: 'TEXT_IMAGE',
    textToImageParams: { text: prompt },
    imageGenerationConfig: {
      numberOfImages: 1,
      height: 1024,
      width: 1024,
      cfgScale: 8.0,
    },
  };

  const command = new InvokeModelCommand({
    modelId: 'amazon.titan-image-generator-v2:0',
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(payload),
  });

  const response = await bedrockClient.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  return Buffer.from(responseBody.images[0], 'base64');
}

function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if (current && (current + ' ' + word).length > maxCharsPerLine) {
      lines.push(current);
      current = word;
    } else {
      current = current ? current + ' ' + word : word;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 3);
}

async function addTextOverlay(imageBuffer: Buffer, headline: string): Promise<Buffer> {
  const w = 1024;
  const fontSize = 44;
  const lineHeight = fontSize + 14;
  const padding = 28;
  const maxChars = 30;
  const lines = wrapText(headline, maxChars);
  const textBlockH = lines.length * lineHeight;
  const boxH = textBlockH + padding * 2;
  const boxW = 920;
  const boxX = (w - boxW) / 2;
  const boxY = w - boxH - 50;

  const textLines = lines.map((line, i) => {
    const esc = line.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const y = boxY + padding + i * lineHeight + fontSize;
    return `<text x="${w / 2}" y="${y}" font-family="Arial,Helvetica,sans-serif" font-size="${fontSize}" font-weight="bold" fill="white" text-anchor="middle" filter="url(#shadow)">${esc}</text>`;
  }).join('');

  const svg = Buffer.from(`<svg width="${w}" height="${w}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="1" dy="2" stdDeviation="3" flood-color="black" flood-opacity="0.6" />
      </filter>
    </defs>
    <rect x="${boxX}" y="${boxY}" width="${boxW}" height="${boxH}" rx="12" fill="black" fill-opacity="0.45" />
    ${textLines}
  </svg>`);

  return sharp(imageBuffer)
    .composite([{ input: svg, top: 0, left: 0 }])
    .png()
    .toBuffer();
}

async function uploadToS3(imageBuffer: Buffer, key: string): Promise<string> {
  await s3Client.send(new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: imageBuffer,
    ContentType: 'image/png',
  }));
  return getPresignedUrl(key);
}

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const body = await request.json();
  return withMeter('generate-images', () => handleGenerate(body));
}

async function handleGenerate(body: any) {
  try {
    const { prompt, regenerateIndex, customPrompt, headline, productImageUrl } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    if (!BUCKET_NAME) {
      return NextResponse.json({ error: 'S3 bucket not configured' }, { status: 500 });
    }

    const index = regenerateIndex ?? 0;
    const theme = PHOTO_SET_CONFIG[index];
    if (!theme) {
      return NextResponse.json({ error: 'Invalid slide index' }, { status: 400 });
    }

    if (productImageUrl && index === 0) {
      // Hero slide: use product image directly from Shopify
      const res = await fetch(productImageUrl);
      if (!res.ok) throw new Error('Failed to fetch product image');
      const raw = Buffer.from(await res.arrayBuffer());
      const imageBuffer = await sharp(raw).resize(1024, 1024, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } }).png().toBuffer();
      const s3Key = `generated/${generateId()}-${theme.id}.png`;
      const url = await uploadToS3(imageBuffer, s3Key);
      return NextResponse.json({
        success: true,
        image: { url, s3Key, theme: theme.label, prompt: 'Product hero image', headline: theme.headline(prompt), bodyText: theme.bodyText(prompt), footer: theme.footer?.(prompt) },
      });
    }

    const imagePrompt = customPrompt || theme.visualPrompt(prompt);
    let imageBuffer = await generateImage(imagePrompt);
    const h = headline || theme.headline(prompt);
    imageBuffer = await addTextOverlay(imageBuffer, h);
    const s3Key = `generated/${generateId()}-${theme.id}.png`;
    const url = await uploadToS3(imageBuffer, s3Key);
    const imagePromptUsed = (productImageUrl && index === 0) ? 'Product hero image' : (customPrompt || theme.visualPrompt(prompt));

    return NextResponse.json({
      success: true,
      image: { url, s3Key, theme: theme.label, prompt: imagePromptUsed, headline: h, bodyText: theme.bodyText(prompt), footer: theme.footer?.(prompt) },
    });
  } catch (error) {
    console.error('Image generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate images', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
