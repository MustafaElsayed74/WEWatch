import { del } from '@vercel/blob';
import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export async function POST(request) {
  try {
    const { roomId } = await request.json();
    if (!roomId) {
      return NextResponse.json({ error: 'Missing roomId' }, { status: 400 });
    }

    // Get the room state to find the video URL
    const raw = await redis.get(`room:${roomId}`);
    const state = typeof raw === 'string' ? JSON.parse(raw) : raw;

    // Delete the video from Vercel Blob
    if (state?.videoUrl) {
      try {
        await del(state.videoUrl, { token: process.env.BLOB_READ_WRITE_TOKEN });
      } catch (e) {
        console.error('Failed to delete blob:', e);
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
