import { NextRequest, NextResponse } from 'next/server';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, BUCKET_NAME, getPresignedUrl } from '@/lib/s3';
import { Readable } from 'stream';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { tmpdir } from 'os';

async function downloadFromS3(bucket: string, key: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  const response = await s3Client.send(command);
  const stream = response.Body as Readable;
  
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  
  return Buffer.concat(chunks);
}

async function createVideoFromImages(
  imagePaths: string[],
  outputPath: string,
  transitionDuration: number = 1.5,
  overlayTexts?: (string | undefined)[],
  textPositions?: (string | undefined)[],
  animationTypes?: (string | undefined)[],
  tempDir?: string
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      // Dynamically import FFmpeg
      const ffmpegModule = await import('fluent-ffmpeg');
      const ffmpeg = ffmpegModule.default;
      
      // Try to use system FFmpeg first (from Homebrew)
      let ffmpegPath = '/opt/homebrew/bin/ffmpeg'; // macOS ARM default
      
      // Check if system FFmpeg exists
      const { existsSync } = await import('fs');
      if (!existsSync(ffmpegPath)) {
        // Try Intel Mac path
        ffmpegPath = '/usr/local/bin/ffmpeg';
        if (!existsSync(ffmpegPath)) {
          // Try npm installed FFmpeg as fallback
          try {
            const ffmpegInstaller = await import('@ffmpeg-installer/ffmpeg');
            ffmpegPath = ffmpegInstaller.default?.path || ffmpegInstaller.path;
          } catch (e) {
            reject(new Error(
              'FFmpeg not found. Please install it with: brew install ffmpeg'
            ));
            return;
          }
        }
      }
      
      if (!ffmpegPath) {
        reject(new Error('FFmpeg path not found'));
        return;
      }
      
      ffmpeg.setFfmpegPath(ffmpegPath);
      
      const command = ffmpeg();

    // Add all images as inputs with loop
    const imageDuration = 3; // Each image displays for 3 seconds
    const inputDuration = imageDuration + transitionDuration;
    imagePaths.forEach(imagePath => {
      command.input(imagePath)
        .inputOptions([
          '-loop', '1',
          '-t', inputDuration.toString()
        ]);
    });

    // Build filter complex for transitions
    const filterComplex: string[] = [];
    const textFiles: string[] = [];

    // Scale all images to reel format (1080x1920 - 9:16) and add text overlays
    for (let i = 0; i < imagePaths.length; i++) {
      const animation = animationTypes?.[i] || 'zoom_in';
      const frames = Math.floor(inputDuration * 30);
      let filter = `[${i}:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1`;
      
      // Apply gentle motion effect based on animation type, trim to exact duration
      if (animation === 'zoom_in') {
        filter += `,zoompan=z='min(zoom+0.0004,1.08)':d=${frames}:x='trunc(iw/2-(iw/zoom/2))':y='trunc(ih/2-(ih/zoom/2))':s=1080x1920:fps=30,trim=duration=${inputDuration},setpts=PTS-STARTPTS`;
      } else if (animation === 'zoom_in_slow') {
        filter += `,zoompan=z='min(zoom+0.0003,1.06)':d=${frames}:x='trunc(iw/2-(iw/zoom/2))':y='trunc(ih/2-(ih/zoom/2))':s=1080x1920:fps=30,trim=duration=${inputDuration},setpts=PTS-STARTPTS`;
      } else if (animation === 'zoom_in_center') {
        filter += `,zoompan=z='min(zoom+0.0005,1.08)':d=${frames}:x='trunc(iw/2-(iw/zoom/2))':y='trunc(ih/2-(ih/zoom/2))':s=1080x1920:fps=30,trim=duration=${inputDuration},setpts=PTS-STARTPTS`;
      } else if (animation === 'pan_right') {
        filter += `,zoompan=z='1.08':d=${frames}:x='trunc((iw-iw/zoom)/2+((iw/zoom)*0.05*(on/${frames})))':y='trunc(ih/2-(ih/zoom/2))':s=1080x1920:fps=30,trim=duration=${inputDuration},setpts=PTS-STARTPTS`;
      } else if (animation === 'ken_burns') {
        filter += `,zoompan=z='min(zoom+0.0004,1.08)':d=${frames}:x='trunc((iw-iw/zoom)/2+((iw/zoom)*0.03*(on/${frames})))':y='trunc(ih/2-(ih/zoom/2))':s=1080x1920:fps=30,trim=duration=${inputDuration},setpts=PTS-STARTPTS`;
      } else {
        filter += `,fps=30`;
      }
      
      filter += `,format=yuv420p`;
      
      // Add text overlay if provided
      if (overlayTexts && overlayTexts[i]) {
        console.log(`Adding text overlay for image ${i}: "${overlayTexts[i]}"`);
        const { writeFileSync } = await import('fs');
        
        // Wrap text manually - split into lines of ~30 characters
        const text = String(overlayTexts[i]);
        const words = text.split(' ');
        const lines: string[] = [];
        let currentLine = '';
        
        words.forEach(word => {
          if ((currentLine + ' ' + word).length <= 30) {
            currentLine += (currentLine ? ' ' : '') + word;
          } else {
            if (currentLine) lines.push(currentLine);
            currentLine = word;
          }
        });
        if (currentLine) lines.push(currentLine);
        
        const wrappedText = lines.join('\n');
        const textFilePath = path.join(tempDir!, `text-${i}-${Date.now()}.txt`);
        writeFileSync(textFilePath, wrappedText);
        textFiles.push(textFilePath);
        
        // Backdrop just around text, not full width
        const bgHeight = lines.length * 70 + 60;
        const bgWidth = 900;
        const bgX = `(w-${bgWidth})/2`;
        const position = textPositions?.[i] || 'middle';
        let boxY: string;
        let textY: string;
        if (position === 'top') {
          boxY = '100';
          textY = `${100 + 30}`;
        } else if (position === 'bottom') {
          boxY = `h-${bgHeight}-100`;
          textY = `h-${bgHeight}-100+30`;
        } else {
          boxY = `(h-${bgHeight})/2`;
          textY = `(h-${bgHeight})/2+30`;
        }
        
        filter += `,drawbox=x=${bgX}:y=${boxY}:w=${bgWidth}:h=${bgHeight}:color=black@0.35:t=fill`;
        filter += `,drawtext=textfile='${textFilePath}':fontsize=48:fontcolor=white:x=(w-text_w)/2:y=${textY}:shadowcolor=black@0.8:shadowx=2:shadowy=2:line_spacing=12`;
      } else {
        console.log(`No text overlay for image ${i}`);
      }
      
      filterComplex.push(`${filter}[v${i}]`);
    }

    // Create transitions between images
    // xfade offset is relative to the output timeline
    let currentStream = '[v0]';
    
    for (let i = 0; i < imagePaths.length - 1; i++) {
      const nextStream = `[v${i + 1}]`;
      const outputLabel = i === imagePaths.length - 2 ? 'out' : `tmp${i}`;
      
      // After first xfade, output duration = inputDuration + inputDuration - transitionDuration
      // Each subsequent offset = previous output duration - transitionDuration
      const offset = inputDuration * (i + 1) - transitionDuration * i - transitionDuration;
      
      filterComplex.push(
        `${currentStream}${nextStream}xfade=transition=fade:duration=${transitionDuration}:offset=${offset}[${outputLabel}]`
      );
      
      currentStream = `[${outputLabel}]`;
    }

    command
      .complexFilter(filterComplex)
      .outputOptions([
        '-map', '[out]',
        '-c:v', 'libx264',
        '-preset', 'medium',
        '-crf', '23',
        '-movflags', '+faststart'
      ])
      .output(outputPath)
      .on('start', (commandLine: string) => {
        console.log('FFmpeg command:', commandLine);
      })
      .on('stderr', (stderrLine: string) => {
        console.log('FFmpeg:', stderrLine);
      })
      .on('end', () => {
        // Clean up text files
        textFiles.forEach(f => unlink(f).catch(() => {}));
        resolve();
      })
      .on('error', (err: Error, stdout: any, stderr: any) => {
        console.error('FFmpeg error:', err.message);
        console.error('FFmpeg stderr:', stderr);
        // Clean up text files
        textFiles.forEach(f => unlink(f).catch(() => {}));
        reject(err);
      })
      .run();
    } catch (error) {
      reject(error);
    }
  });
}

export async function POST(request: NextRequest) {
  const tempDir = path.join(tmpdir(), 'reel-generation');
  const imagePaths: string[] = [];
  const outputPath = path.join(tempDir, `reel-${Date.now()}.mp4`);

  try {
    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { images, transitionDuration = 1.5 } = body;

    // Validate images array
    if (!images || !Array.isArray(images)) {
      return NextResponse.json(
        { error: 'Images must be provided as an array' },
        { status: 400 }
      );
    }

    if (images.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 images are required to create a reel' },
        { status: 400 }
      );
    }

    if (images.length > 20) {
      return NextResponse.json(
        { error: 'Maximum 20 images allowed per reel' },
        { status: 400 }
      );
    }

    // Validate each image object
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      if (!image || typeof image !== 'object') {
        return NextResponse.json(
          { error: `Image at index ${i} is invalid` },
          { status: 400 }
        );
      }
      if (!image.s3Key || typeof image.s3Key !== 'string') {
        return NextResponse.json(
          { error: `Image at index ${i} is missing s3Key` },
          { status: 400 }
        );
      }
    }

    // Validate transition duration
    if (typeof transitionDuration !== 'number') {
      return NextResponse.json(
        { error: 'Transition duration must be a number' },
        { status: 400 }
      );
    }

    if (transitionDuration < 0.5 || transitionDuration > 3) {
      return NextResponse.json(
        { error: 'Transition duration must be between 0.5 and 3 seconds' },
        { status: 400 }
      );
    }

    // Validate AWS configuration
    const bucketName = BUCKET_NAME;
    const awsRegion = process.env.AWS_REGION;
    const awsAccessKey = process.env.AWS_ACCESS_KEY_ID;
    const awsSecretKey = process.env.AWS_SECRET_ACCESS_KEY;
    
    if (!bucketName) {
      return NextResponse.json(
        { error: 'S3 bucket name not configured. Please set AWS_S3_BUCKET_NAME in environment variables.' },
        { status: 500 }
      );
    }

    if (!awsAccessKey || !awsSecretKey) {
      return NextResponse.json(
        { error: 'AWS credentials not configured. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.' },
        { status: 500 }
      );
    }

    // Create temp directory if it doesn't exist
    if (!existsSync(tempDir)) {
      await mkdir(tempDir, { recursive: true });
    }

    // Download images from S3
    console.log(`Downloading ${images.length} images from S3...`);
    for (let i = 0; i < images.length; i++) {
      const imageKey = images[i].s3Key;
      const imagePath = path.join(tempDir, `image-${i}-${Date.now()}.jpg`);
      
      try {
        const imageBuffer = await downloadFromS3(bucketName, imageKey);
        
        if (!imageBuffer || imageBuffer.length === 0) {
          throw new Error(`Image ${i + 1} (${imageKey}) is empty or corrupted`);
        }
        
        await writeFile(imagePath, imageBuffer);
        imagePaths.push(imagePath);
        console.log(`Downloaded image ${i + 1}/${images.length}: ${imageKey}`);
      } catch (downloadError) {
        throw new Error(
          `Failed to download image ${i + 1} (${imageKey}): ${
            downloadError instanceof Error ? downloadError.message : 'Unknown error'
          }`
        );
      }
    }

    // Create video from images
    console.log('Creating video with FFmpeg...');
    const overlayTexts = images.map((img: any) => img.overlayText);
    const textPositions = images.map((img: any) => img.textPosition);
    const animationTypes = images.map((img: any) => img.animationType);
    try {
      await createVideoFromImages(imagePaths, outputPath, transitionDuration, overlayTexts, textPositions, animationTypes, tempDir);
      console.log('Video creation completed');
    } catch (ffmpegError) {
      throw new Error(
        `Video generation failed: ${
          ffmpegError instanceof Error ? ffmpegError.message : 'FFmpeg processing error'
        }. Please ensure all images are valid.`
      );
    }

    // Verify output file exists
    if (!existsSync(outputPath)) {
      throw new Error('Video file was not created. FFmpeg may have failed silently.');
    }

    // Read the generated video
    console.log('Reading generated video file...');
    let videoBuffer;
    try {
      videoBuffer = await require('fs/promises').readFile(outputPath);
      
      if (!videoBuffer || videoBuffer.length === 0) {
        throw new Error('Generated video file is empty');
      }
      
      console.log(`Video file size: ${(videoBuffer.length / 1024 / 1024).toFixed(2)} MB`);
    } catch (readError) {
      throw new Error(
        `Failed to read generated video: ${
          readError instanceof Error ? readError.message : 'Unknown error'
        }`
      );
    }

    // Upload video to S3
    const videoKey = `reels/reel-${Date.now()}.mp4`;
    console.log(`Uploading video to S3: ${videoKey}`);
    
    const uploadCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: videoKey,
      Body: videoBuffer,
      ContentType: 'video/mp4',
    });

    try {
      await s3Client.send(uploadCommand);
      console.log('Video uploaded successfully to S3');
    } catch (uploadError) {
      throw new Error(
        `Failed to upload video to S3: ${
          uploadError instanceof Error ? uploadError.message : 'Unknown error'
        }`
      );
    }

    // Clean up temp files
    for (const imagePath of imagePaths) {
      await unlink(imagePath).catch(() => {});
    }
    await unlink(outputPath).catch(() => {});

    const videoUrl = await getPresignedUrl(videoKey);

    return NextResponse.json({
      success: true,
      videoUrl,
      videoKey,
      message: 'Reel created successfully',
    });
  } catch (error) {
    console.error('Reel creation error:', error);
    
    // Clean up on error
    for (const imagePath of imagePaths) {
      await unlink(imagePath).catch(() => {});
    }
    await unlink(outputPath).catch(() => {});

    return NextResponse.json(
      { 
        error: 'Reel creation failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}