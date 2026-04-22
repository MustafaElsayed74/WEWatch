import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
// We know from testing that this token's store URL is:
// https://knyfyyy3j7bnmgja.public.blob.vercel-storage.com/
const STORE_URL = 'https://knyfyyy3j7bnmgja.public.blob.vercel-storage.com';

export async function POST(request) {
  try {
    const { roomId, state } = await request.json();
    if (!roomId || !state) {
      return NextResponse.json({ error: 'Missing roomId or state' }, { status: 400 });
    }

    // put() works perfectly — tested and confirmed
    await put(`rooms/${roomId}.json`, JSON.stringify(state), {
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
    // Directly fetch the blob using the known store URL
    // This avoids the buggy list()/head() SDK methods entirely
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
