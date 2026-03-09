import { NextRequest, NextResponse } from 'next/server';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
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

const s3Client = new S3Client({
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

function addTextOverlay(imageBuffer: Buffer, headline: string, tempDir: string): Buffer {
  const inputPath = join(tempDir, `in-${generateId()}.png`);
  const outputPath = join(tempDir, `out-${generateId()}.png`);
  writeFileSync(inputPath, imageBuffer);

  const escaped = headline.replace(/'/g, "'\\''").replace(/:/g, '\\:').replace(/\n/g, ' ').replace(/\r/g, '');
  const fontSize = 46;
  const padding = 24;
  const boxH = fontSize + padding * 2;
  const boxY = 1024 - boxH - 50;
  const textY = boxY + padding;

  try {
    const filter = [
      `drawbox=x=(iw-920)/2:y=${boxY}:w=920:h=${boxH}:color=black@0.4:t=fill`,
      `drawtext=text='${escaped}':fontsize=${fontSize}:fontcolor=white:x=(w-text_w)/2:y=${textY}:shadowcolor=black@0.6:shadowx=2:shadowy=2`,
    ].join(',');

    execSync(`ffmpeg -y -i "${inputPath}" -vf "${filter}" "${outputPath}"`, { stdio: 'pipe' });
    return readFileSync(outputPath);
  } finally {
    try { unlinkSync(inputPath); } catch {}
    try { unlinkSync(outputPath); } catch {}
  }
}

async function uploadToS3(imageBuffer: Buffer, key: string): Promise<string> {
  const bucketName = process.env.AWS_S3_BUCKET_NAME!;
  await s3Client.send(new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: imageBuffer,
    ContentType: 'image/png',
  }));
  return `https://${bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;
}

export async function POST(request: NextRequest) {
  try {
    const { prompt, regenerateIndex, customPrompt, headline } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    if (!process.env.AWS_S3_BUCKET_NAME) {
      return NextResponse.json({ error: 'S3 bucket not configured' }, { status: 500 });
    }

    const tempDir = join(tmpdir(), 'convertly-gen');
    mkdirSync(tempDir, { recursive: true });

    // Regenerate single image
    if (regenerateIndex !== undefined && customPrompt) {
      const theme = PHOTO_SET_CONFIG[regenerateIndex];
      let imageBuffer = await generateImage(customPrompt);
      const h = headline || theme.headline(prompt);
      imageBuffer = addTextOverlay(imageBuffer, h, tempDir);
      const s3Key = `generated/${generateId()}-${theme.id}.png`;
      const url = await uploadToS3(imageBuffer, s3Key);
      return NextResponse.json({
        success: true,
        image: { url, s3Key, theme: theme.label, prompt: customPrompt, headline: h },
      });
    }

    // Generate all 7 images
    const results = [];
    for (const theme of PHOTO_SET_CONFIG) {
      const imagePrompt = theme.visualPrompt(prompt);
      let imageBuffer = await generateImage(imagePrompt);
      const h = theme.headline(prompt);
      imageBuffer = addTextOverlay(imageBuffer, h, tempDir);
      const s3Key = `generated/${generateId()}-${theme.id}.png`;
      const url = await uploadToS3(imageBuffer, s3Key);
      results.push({ url, s3Key, theme: theme.label, prompt: imagePrompt, headline: h });
    }

    return NextResponse.json({ success: true, images: results });
  } catch (error) {
    console.error('Image generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate images', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
