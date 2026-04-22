'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import PusherClient from 'pusher-js';

export default function VideoPlayer({ roomId, videoUrl, isHost }) {
  const videoRef = useRef(null);
  const lastSyncTimestamp = useRef(0);
  const remoteState = useRef({ isPlaying: false, time: 0, timestamp: 0 });
  const [primed, setPrimed] = useState(isHost);
  const pusherRef = useRef(null);

  // ---- PUSHER: real-time sync for guests (replaces polling) ----
  useEffect(() => {
    if (isHost || !primed) return;

    const pusher = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
    });
    pusherRef.current = pusher;

    const channel = pusher.subscribe(`room-${roomId}`);

    channel.bind('sync', (state) => {
      const vid = videoRef.current;
      if (!vid) return;

      remoteState.current = state;

      // Compensate for network delay
      const elapsed = state.isPlaying ? (Date.now() - state.timestamp) / 1000 : 0;
      const targetTime = state.time + elapsed;

      // Sync time if drift > 1.5s
      if (Math.abs(vid.currentTime - targetTime) > 1.5) {
        vid.currentTime = targetTime;
      }

      // Sync play/pause
      if (state.isPlaying && vid.paused) {
        vid.play().catch(() => {});
      } else if (!state.isPlaying && !vid.paused) {
        vid.pause();
      }
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`room-${roomId}`);
      pusher.disconnect();
    };
  }, [isHost, primed, roomId]);

  // ---- HOST: push state to server (Pusher broadcasts to all guests) ----
  const pushState = useCallback(async (isPlaying, time) => {
    if (!isHost) return;

    const state = { videoUrl, isPlaying, time, timestamp: Date.now() };
    remoteState.current = state;

    try {
      await fetch('/api/pusher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, state }),
      });
    } catch {}
  }, [roomId, videoUrl, isHost]);

  // ---- Host event handlers ----
  const onPlay = () => pushState(true, videoRef.current.currentTime);
  const onPause = () => pushState(false, videoRef.current.currentTime);
  const onSeeked = () => pushState(!videoRef.current.paused, videoRef.current.currentTime);

  // ---- Guest primer: one click to unlock autoplay ----
  const handlePrimer = async () => {
    const vid = videoRef.current;
    if (!vid) return;

    try {
      // Fetch current state from Redis (for late joiners)
      const res = await fetch(`/api/sync?roomId=${roomId}`);
      const data = await res.json();

      if (data?.state) {
        const s = data.state;
        remoteState.current = s;
        const elapsed = s.isPlaying ? (Date.now() - s.timestamp) / 1000 : 0;
        vid.currentTime = s.time + elapsed;
        if (s.isPlaying) await vid.play().catch(() => {});
      }
    } catch {}

    setPrimed(true); // starts Pusher subscription via useEffect
  };

  return (
    <div className="w-full">
      <div className="relative">
        {/* Ambient glow */}
        <div className="absolute -inset-4 rounded-3xl opacity-20 blur-2xl -z-10 pointer-events-none"
             style={{ background: 'linear-gradient(135deg, var(--color-primary), transparent 60%)' }} />

        <div className="glass overflow-hidden relative" style={{ padding: 0, borderRadius: 20, background: '#000' }}>
          <video
            ref={videoRef}
            src={videoUrl}
            controls={isHost}
            playsInline
            className="w-full block"
            style={{ maxHeight: '78vh', objectFit: 'contain' }}
            onPlay={isHost ? onPlay : undefined}
            onPause={isHost ? onPause : undefined}
            onSeeked={isHost ? onSeeked : undefined}
          />

          {/* Guest priming overlay */}
          {!isHost && !primed && (
            <div
              className="absolute inset-0 flex items-center justify-center cursor-pointer animate-in"
              style={{ background: 'rgba(0,0,0,.8)', backdropFilter: 'blur(4px)', zIndex: 10 }}
              onClick={handlePrimer}
            >
              <div className="flex flex-col items-center gap-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full flex items-center justify-center relative z-10"
                       style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))', boxShadow: '0 8px 40px rgba(139,92,246,.4)' }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="#fff" strokeWidth="0">
                      <polygon points="7 4 19 12 7 20 7 4"/>
                    </svg>
                  </div>
                  <div className="absolute inset-0 rounded-full animate-ping opacity-20"
                       style={{ background: 'var(--color-primary)' }} />
                </div>
                <div className="text-center">
                  <p className="text-white text-base font-semibold mb-1">Click to join the room</p>
                  <p className="text-sm text-muted">You&apos;ll sync with the host instantly</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div className="glass flex items-center justify-center gap-2.5 mt-3 py-2.5 px-4 mx-auto w-fit" style={{ borderRadius: 100 }}>
        <span className="w-1.5 h-1.5 rounded-full"
              style={{ background: isHost ? 'var(--color-success)' : primed ? 'var(--color-success)' : 'var(--color-muted)', animation: primed || isHost ? 'pulse 2s ease-in-out infinite' : 'none' }}></span>
        <span className="text-[11px] font-medium" style={{ color: isHost || primed ? '#94a3b8' : 'var(--color-muted)' }}>
          {isHost ? 'You control playback' : primed ? 'Live — synced with host' : 'Tap to connect'}
        </span>
      </div>
    </div>
  );
}
