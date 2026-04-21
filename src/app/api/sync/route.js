import { NextResponse } from 'next/server';

const KVDB_BUCKET = 'JihU9zcJHZNzyUAdw2ifg4';

export async function POST(request) {
  try {
    const { roomId, state } = await request.json();

    if (!roomId || !state) {
      return NextResponse.json({ error: 'Missing roomId or state' }, { status: 400 });
    }

    // Save the state to kvdb.io (a free public key-value store)
    // This completely bypasses Vercel Blob's private store restrictions
    const url = `https://kvdb.io/${KVDB_BUCKET}/${roomId}`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
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
    const url = `https://kvdb.io/${KVDB_BUCKET}/${roomId}?t=${Date.now()}`;
    const response = await fetch(url, {
      cache: 'no-store'
    });

    if (!response.ok) {
      return NextResponse.json({ state: null });
    }

    const state = await response.json();
    return NextResponse.json({ state });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
