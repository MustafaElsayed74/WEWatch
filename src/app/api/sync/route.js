import { put, list } from '@vercel/blob';
import { NextResponse } from 'next/server';

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

export async function POST(request) {
  try {
    const { roomId, state } = await request.json();
    if (!roomId || !state) {
      return NextResponse.json({ error: 'Missing roomId or state' }, { status: 400 });
    }

    const blob = await put(`rooms/${roomId}.json`, JSON.stringify(state), {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'application/json',
      token: TOKEN,
    });

    return NextResponse.json({ success: true, url: blob.url });
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
    // Use list() to find the blob by prefix — most reliable approach
    const { blobs } = await list({ prefix: `rooms/${roomId}.json`, token: TOKEN });

    if (!blobs || blobs.length === 0) {
      return NextResponse.json({ state: null });
    }

    // Fetch the blob content with cache-busting
    const blobUrl = blobs[0].url;
    const res = await fetch(`${blobUrl}?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) {
      return NextResponse.json({ state: null });
    }

    const state = await res.json();
    return NextResponse.json({ state });
  } catch (error) {
    console.error('Sync GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
