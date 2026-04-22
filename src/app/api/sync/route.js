import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
// kvdb.io bucket for real-time sync state (tiny JSON, <1KB)
// Vercel Blob is great for large files but its list()/head() SDK has bugs
// kvdb.io is instant, no auth, no CORS, perfect for real-time state
const KVDB = 'JihU9zcJHZNzyUAdw2ifg4';

export async function POST(request) {
  try {
    const { roomId, state } = await request.json();
    if (!roomId || !state) {
      return NextResponse.json({ error: 'Missing roomId or state' }, { status: 400 });
    }

    // Save to kvdb.io (instant, reliable)
    await fetch(`https://kvdb.io/${KVDB}/${roomId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Sync POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get('roomId');
  if (!roomId) {
    return NextResponse.json({ error: 'Missing roomId' }, { status: 400 });
  }

  try {
    const res = await fetch(`https://kvdb.io/${KVDB}/${roomId}`, { cache: 'no-store' });

    if (!res.ok) {
      return NextResponse.json({ state: null });
    }

    const text = await res.text();
    if (!text || text.trim() === '') {
      return NextResponse.json({ state: null });
    }

    const state = JSON.parse(text);
    return NextResponse.json({ state });
  } catch (error) {
    console.error('Sync GET error:', error);
    return NextResponse.json({ state: null });
  }
}
