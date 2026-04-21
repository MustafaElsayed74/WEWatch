import { put, head } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { roomId, state } = await request.json();

    if (!roomId || !state) {
      return NextResponse.json({ error: 'Missing roomId or state' }, { status: 400 });
    }

    // Save the state as a JSON file in Vercel Blob
    // addRandomSuffix: false means it will overwrite the file, effectively keeping our state updated
    const blobName = `rooms/${roomId}.json`;
    const blob = await put(blobName, JSON.stringify(state), {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'application/json',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    return NextResponse.json({ success: true, url: blob.url });
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
    const blobName = `rooms/${roomId}.json`;
    
    // Instead of using list/head which can be slow or cached incorrectly,
    // we fetch the Blob URL directly. However, we add a timestamp to bypass edge cache!
    const url = `https://${process.env.BLOB_READ_WRITE_TOKEN.split('_')[3].toLowerCase()}.public.blob.vercel-storage.com/${blobName}`;
    
    const response = await fetch(`${url}?t=${Date.now()}`, {
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
