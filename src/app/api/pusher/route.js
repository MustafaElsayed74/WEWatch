import Pusher from 'pusher';
import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true,
});

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export async function POST(request) {
  try {
    const { roomId, state } = await request.json();
    if (!roomId || !state) {
      return NextResponse.json({ error: 'Missing roomId or state' }, { status: 400 });
    }

    // Save to Redis (persistent state for late joiners)
    await redis.set(`room:${roomId}`, JSON.stringify(state), { ex: 21600 });

    // Push to all connected guests instantly via WebSocket
    await pusher.trigger(`room-${roomId}`, 'sync', state);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Pusher POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
