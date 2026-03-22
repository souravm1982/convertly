import { NextRequest, NextResponse } from 'next/server';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, BUCKET_NAME } from '@/lib/s3';

export async function GET(request: NextRequest) {
  const s3Key = request.nextUrl.searchParams.get('key');
  const filename = request.nextUrl.searchParams.get('filename') || 'image.png';

  if (!s3Key) {
    return NextResponse.json({ error: 'key is required' }, { status: 400 });
  }

  try {
    const response = await s3Client.send(new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
    }));

    const bytes = await response.Body!.transformToByteArray();

    return new NextResponse(Buffer.from(bytes), {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json({ error: 'Download failed' }, { status: 500 });
  }
}
