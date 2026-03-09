import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const checks = {
    ffmpegInstalled: false,
    ffmpegPath: '',
    ffmpegExists: false,
    ffmpegError: '',
    awsConfigured: false,
    s3Bucket: '',
    awsRegion: '',
    hasAccessKey: false,
    hasSecretKey: false,
    nodeVersion: process.version,
    platform: process.platform,
    testSuccess: false,
  };

  try {
    // Check FFmpeg installation
    try {
      const ffmpegInstaller = await import('@ffmpeg-installer/ffmpeg');
      const { existsSync } = await import('fs');
      
      if (ffmpegInstaller && ffmpegInstaller.default && ffmpegInstaller.default.path) {
        checks.ffmpegPath = ffmpegInstaller.default.path;
        checks.ffmpegExists = existsSync(ffmpegInstaller.default.path);
        checks.ffmpegInstalled = true;
      } else if (ffmpegInstaller && ffmpegInstaller.path) {
        checks.ffmpegPath = ffmpegInstaller.path;
        checks.ffmpegExists = existsSync(ffmpegInstaller.path);
        checks.ffmpegInstalled = true;
      } else {
        checks.ffmpegError = 'FFmpeg installer loaded but no path found';
      }
    } catch (e) {
      checks.ffmpegInstalled = false;
      checks.ffmpegError = e instanceof Error ? e.message : 'Failed to load @ffmpeg-installer/ffmpeg';
    }

    // Check AWS configuration
    checks.s3Bucket = process.env.AWS_S3_BUCKET_NAME || 'NOT_SET';
    checks.awsRegion = process.env.AWS_REGION || 'NOT_SET';
    checks.hasAccessKey = !!process.env.AWS_ACCESS_KEY_ID;
    checks.hasSecretKey = !!process.env.AWS_SECRET_ACCESS_KEY;
    checks.awsConfigured = !!(
      process.env.AWS_S3_BUCKET_NAME &&
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY
    );

    checks.testSuccess = true;

    return NextResponse.json({
      success: true,
      message: 'Test endpoint working',
      checks,
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        checks,
      },
      { status: 500 }
    );
  }
}
