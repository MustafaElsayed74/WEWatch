import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const s3 = new S3Client({
  region: 'us-east-005',
  endpoint: 'https://s3.us-east-005.backblazeb2.com',
  credentials: {
    accessKeyId: '0058aa28ea086c70000000001',
    secretAccessKey: 'K005PCMtYa0FzXu3otF5+eVl+YZ+qDE',
  },
  forcePathStyle: true,
});

export async function POST(request) {
  try {
    const { roomId } = await request.json();
    if (!roomId) {
      return NextResponse.json({ error: 'Missing roomId' }, { status: 400 });
    }

    // Get room state to find the video key
    const raw = await redis.get(`room:${roomId}`);
    const state = typeof raw === 'string' ? JSON.parse(raw) : raw;

    // Delete video from B2
    if (state?.videoKey) {
      try {
        await s3.send(new DeleteObjectCommand({ Bucket: 'Wewatch', Key: state.videoKey }));
      } catch (e) {
        console.error('Failed to delete from B2:', e);
      }
    }

    // Delete room state from Redis
    await redis.del(`room:${roomId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Close room error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
