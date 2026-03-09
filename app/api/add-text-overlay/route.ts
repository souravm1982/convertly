import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { tmpdir } from 'os';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

async function downloadFromS3(bucket: string, key: string): Promise<Buffer> {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  const response = await s3Client.send(command);
  const stream = response.Body as Readable;
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function addTextAndMotion(
  imagePath: string,
  outputPath: string,
  text: string,
  motionEffect: string,
  duration: number
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      const ffmpegModule = await import('fluent-ffmpeg');
      const ffmpeg = ffmpegModule.default;
      
      let ffmpegPath = '/opt/homebrew/bin/ffmpeg';
      if (!existsSync(ffmpegPath)) {
        ffmpegPath = '/usr/local/bin/ffmpeg';
        if (!existsSync(ffmpegPath)) {
          try {
            const ffmpegInstaller = await import('@ffmpeg-installer/ffmpeg');
            ffmpegPath = ffmpegInstaller.default?.path || ffmpegInstaller.path;
          } catch (e) {
            reject(new Error('FFmpeg not found'));
            return;
          }
        }
      }
      
      ffmpeg.setFfmpegPath(ffmpegPath);
      
      const command = ffmpeg()
        .input(imagePath)
        .inputOptions(['-loop', '1', '-t', duration.toString()]);

      // Motion effects filter
      let videoFilter = 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2';
      
      if (motionEffect === 'zoom') {
        videoFilter += `,zoompan=z='min(zoom+0.0015,1.5)':d=${duration * 30}:s=1920x1080`;
      } else if (motionEffect === 'pan') {
        videoFilter += `,zoompan=z='1.3':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)+((ih/zoom/2)*sin(in_time/2))':d=${duration * 30}:s=1920x1080`;
      } else if (motionEffect === 'fade') {
        videoFilter += `,fade=t=in:st=0:d=0.5,fade=t=out:st=${duration - 0.5}:d=0.5`;
      }

      // Text overlay
      const escapedText = text.replace(/'/g, "\\'").replace(/:/g, '\\:');
      videoFilter += `,drawtext=text='${escapedText}':fontsize=80:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2:shadowcolor=black:shadowx=2:shadowy=2`;

      command
        .videoFilter(videoFilter)
        .outputOptions([
          '-c:v', 'libx264',
          '-preset', 'medium',
          '-crf', '23',
          '-pix_fmt', 'yuv420p',
          '-movflags', '+faststart'
        ])
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', (err: Error) => reject(err))
        .run();
    } catch (error) {
      reject(error);
    }
  });
}

export async function POST(request: NextRequest) {
  const tempDir = path.join(tmpdir(), 'text-overlay');
  let imagePath = '';
  let outputPath = '';

  try {
    const { s3Key, text, motionEffect = 'none', duration = 3 } = await request.json();

    if (!s3Key || !text) {
      return NextResponse.json(
        { error: 'S3 key and text are required' },
        { status: 400 }
      );
    }

    const bucketName = process.env.AWS_S3_BUCKET_NAME;
    if (!bucketName) {
      return NextResponse.json(
        { error: 'S3 bucket not configured' },
        { status: 500 }
      );
    }

    if (!existsSync(tempDir)) {
      await mkdir(tempDir, { recursive: true });
    }

    imagePath = path.join(tempDir, `input-${Date.now()}.jpg`);
    outputPath = path.join(tempDir, `output-${Date.now()}.mp4`);

    const imageBuffer = await downloadFromS3(bucketName, s3Key);
    await writeFile(imagePath, imageBuffer);

    await addTextAndMotion(imagePath, outputPath, text, motionEffect, duration);

    const videoBuffer = await require('fs/promises').readFile(outputPath);
    const videoKey = `enhanced/video-${Date.now()}.mp4`;

    await s3Client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: videoKey,
      Body: videoBuffer,
      ContentType: 'video/mp4',
    }));

    await unlink(imagePath).catch(() => {});
    await unlink(outputPath).catch(() => {});

    const videoUrl = `https://${bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${videoKey}`;

    return NextResponse.json({
      success: true,
      videoUrl,
      videoKey,
      message: 'Video created with text overlay and motion effect',
    });
  } catch (error) {
    console.error('Text overlay error:', error);
    
    if (imagePath) await unlink(imagePath).catch(() => {});
    if (outputPath) await unlink(outputPath).catch(() => {});

    return NextResponse.json(
      {
        error: 'Failed to add text overlay',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
