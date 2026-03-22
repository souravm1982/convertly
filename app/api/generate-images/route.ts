import { NextRequest, NextResponse } from 'next/server';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, BUCKET_NAME, getPresignedUrl } from '@/lib/s3';
import { PHOTO_SET_CONFIG } from '@/config/photo-set.config';
import { execSync } from 'child_process';
import { writeFileSync, readFileSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

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

function addTextOverlay(imageBuffer: Buffer, headline: string, tempDir: string): Buffer {
  const inputPath = join(tempDir, `in-${generateId()}.png`);
  const outputPath = join(tempDir, `out-${generateId()}.png`);
  writeFileSync(inputPath, imageBuffer);

  const fontSize = 44;
  const lineHeight = fontSize + 12;
  const padding = 24;
  const maxChars = 30;
  const lines = wrapText(headline, maxChars);
  const textBlockH = lines.length * lineHeight;
  const boxH = textBlockH + padding * 2;
  const boxW = 920;
  const boxY = 1024 - boxH - 50;

  try {
    const filters: string[] = [
      `drawbox=x=(iw-${boxW})/2:y=${boxY}:w=${boxW}:h=${boxH}:color=black@0.45:t=fill`,
    ];
    lines.forEach((line, i) => {
      const escaped = line.replace(/'/g, "'\\''").replace(/:/g, '\\:');
      const y = boxY + padding + i * lineHeight;
      filters.push(
        `drawtext=text='${escaped}':fontsize=${fontSize}:fontcolor=white:x=(w-text_w)/2:y=${y}:shadowcolor=black@0.6:shadowx=2:shadowy=2`
      );
    });

    execSync(`ffmpeg -y -i "${inputPath}" -vf "${filters.join(',')}" "${outputPath}"`, { stdio: 'pipe' });
    return readFileSync(outputPath);
  } finally {
    try { unlinkSync(inputPath); } catch {}
    try { unlinkSync(outputPath); } catch {}
  }
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
  try {
    const { prompt, regenerateIndex, customPrompt, headline } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    if (!BUCKET_NAME) {
      return NextResponse.json({ error: 'S3 bucket not configured' }, { status: 500 });
    }

    const tempDir = join(tmpdir(), 'convertly-gen');
    mkdirSync(tempDir, { recursive: true });

    const index = regenerateIndex ?? 0;
    const theme = PHOTO_SET_CONFIG[index];
    if (!theme) {
      return NextResponse.json({ error: 'Invalid slide index' }, { status: 400 });
    }

    const imagePrompt = customPrompt || theme.visualPrompt(prompt);
    let imageBuffer = await generateImage(imagePrompt);
    const h = headline || theme.headline(prompt);
    imageBuffer = addTextOverlay(imageBuffer, h, tempDir);
    const s3Key = `generated/${generateId()}-${theme.id}.png`;
    const url = await uploadToS3(imageBuffer, s3Key);

    return NextResponse.json({
      success: true,
      image: { url, s3Key, theme: theme.label, prompt: imagePrompt, headline: h },
    });
  } catch (error) {
    console.error('Image generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate images', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
