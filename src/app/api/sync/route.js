import { put, del } from '@vercel/blob';
import { NextResponse } from 'next/server';

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const STORE_URL = 'https://knyfyyy3j7bnmgja.public.blob.vercel-storage.com';

export async function POST(request) {
  try {
    const { roomId, state } = await request.json();
    if (!roomId || !state) {
      return NextResponse.json({ error: 'Missing roomId or state' }, { status: 400 });
    }

    const pathname = `rooms/${roomId}.json`;

    // Delete first to avoid SDK overwrite bug (addRandomSuffix: false chokes on existing blobs)
    try {
      await del(`${STORE_URL}/${pathname}`, { token: TOKEN });
    } catch (_) {} // ignore if file doesn't exist yet

    // Write fresh
    await put(pathname, JSON.stringify(state), {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'application/json',
      token: TOKEN,
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
    const url = `${STORE_URL}/rooms/${roomId}.json`;
    const res = await fetch(`${url}?t=${Date.now()}`, { cache: 'no-store' });

    if (!res.ok) {
      return NextResponse.json({ state: null });
    }

    const state = await res.json();
    return NextResponse.json({ state });
  } catch (error) {
    console.error('Sync GET error:', error);
    return NextResponse.json({ state: null });
  }
}
