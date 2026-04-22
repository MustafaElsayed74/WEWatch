import { NextResponse } from 'next/server';

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const STORE_URL = 'https://knyfyyy3j7bnmgja.public.blob.vercel-storage.com';

export async function POST(request) {
  try {
    const { roomId, state } = await request.json();
    if (!roomId || !state) {
      return NextResponse.json({ error: 'Missing roomId or state' }, { status: 400 });
    }

    // Bypass the @vercel/blob SDK entirely — it has overwrite bugs.
    // Use the Vercel Blob REST API directly via fetch().
    const pathname = `rooms/${roomId}.json`;
    const res = await fetch(`https://blob.vercel-storage.com/${pathname}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'x-api-version': '7',
        'x-content-type': 'application/json',
        'x-add-random-suffix': '0',
      },
      body: JSON.stringify(state),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('Blob REST API error:', res.status, text);
      return NextResponse.json({ error: text }, { status: 500 });
    }

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
