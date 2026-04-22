import { S3Client, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { NextResponse } from 'next/server';

const s3 = new S3Client({
  region: 'us-east-005',
  endpoint: 'https://s3.us-east-005.backblazeb2.com',
  credentials: {
    accessKeyId: '0058aa28ea086c70000000001',
    secretAccessKey: 'K005PCMtYa0FzXu3otF5+eVl+YZ+qDE',
  },
  forcePathStyle: true,
});

const BUCKET = 'Wewatch';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');
  if (!key) {
    return NextResponse.json({ error: 'Missing key' }, { status: 400 });
  }

  try {
    // Get file size first
    const head = await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    const fileSize = head.ContentLength;
    const contentType = head.ContentType || 'video/mp4';

    // Handle range requests (required for video seeking)
    const rangeHeader = request.headers.get('range');

    if (rangeHeader) {
      const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
      const start = parseInt(match[1], 10);
      const end = match[2] ? parseInt(match[2], 10) : Math.min(start + 5 * 1024 * 1024, fileSize - 1); // 5MB chunks

      const obj = await s3.send(new GetObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Range: `bytes=${start}-${end}`,
      }));

      return new Response(obj.Body, {
        status: 206,
        headers: {
          'Content-Type': contentType,
          'Content-Length': String(end - start + 1),
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    // Full file request
    const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));

    return new Response(obj.Body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(fileSize),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Stream error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
