import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { NextResponse } from 'next/server';

const B2_KEY_ID = '8aa28ea086c7';
const B2_APP_KEY = '005940491079834ebfcf68da557217476d8c9fb2c4';
const B2_BUCKET = 'Wewatch';
const B2_REGION = 'us-east-005';
const B2_ENDPOINT = `https://s3.${B2_REGION}.backblazeb2.com`;

const s3 = new S3Client({
  region: B2_REGION,
  endpoint: B2_ENDPOINT,
  credentials: {
    accessKeyId: B2_KEY_ID,
    secretAccessKey: B2_APP_KEY,
  },
  forcePathStyle: true,
});

// GET: Generate presigned upload URL + presigned download URL (both work with private buckets)
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('filename');
  const contentType = searchParams.get('contentType') || 'video/mp4';

  if (!filename) {
    return NextResponse.json({ error: 'Missing filename' }, { status: 400 });
  }

  const key = `videos/${Date.now()}-${filename}`;

  try {
    // Presigned PUT URL for upload (1 hour)
    const uploadUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({ Bucket: B2_BUCKET, Key: key, ContentType: contentType }),
      { expiresIn: 3600 }
    );

    // Presigned GET URL for streaming (6 hours — matches room TTL)
    const streamUrl = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: B2_BUCKET, Key: key }),
      { expiresIn: 21600 }
    );

    return NextResponse.json({ uploadUrl, streamUrl, key });
  } catch (error) {
    console.error('Presign error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Remove a video from B2
export async function DELETE(request) {
  const { key } = await request.json();
  if (!key) return NextResponse.json({ error: 'Missing key' }, { status: 400 });

  try {
    await s3.send(new DeleteObjectCommand({ Bucket: B2_BUCKET, Key: key }));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
