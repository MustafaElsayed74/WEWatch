'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

export default function VideoPlayer({ roomId, videoUrl, isHost }) {
  const videoRef = useRef(null);
  const ignoreNextEvent = useRef(false);
  const lastSyncTimestamp = useRef(0);
  const remoteState = useRef({ isPlaying: false, time: 0, timestamp: 0 });
  const [primed, setPrimed] = useState(isHost); // host is always primed
  const pollRef = useRef(null);

  // ---- POLLING (only starts after guest is primed) ----
  const startPolling = useCallback(() => {
    if (pollRef.current) return; // already polling

    const poll = async () => {
      try {
        const res = await fetch(`/api/sync?roomId=${roomId}`);
        const data = await res.json();
        if (!data?.state) return;

        const remote = data.state;
        if (remote.timestamp <= lastSyncTimestamp.current) return;
        lastSyncTimestamp.current = remote.timestamp;
        remoteState.current = remote;

        if (isHost) return; // host is the source of truth

        const vid = videoRef.current;
        if (!vid) return;

        // Compensate for time elapsed since host pushed state
        const elapsed = (Date.now() - remote.timestamp) / 1000;
        const targetTime = remote.isPlaying ? remote.time + elapsed : remote.time;

        // Sync time if drift > 2s
        const drift = Math.abs(vid.currentTime - targetTime);
        if (drift > 2) {
          vid.currentTime = targetTime;
        }

        // Sync play/pause
        if (remote.isPlaying && vid.paused) {
          vid.play().catch(() => {});
        } else if (!remote.isPlaying && !vid.paused) {
          vid.pause();
        }
      } catch {}
    };

    pollRef.current = setInterval(poll, 2000);
    poll(); // immediate first poll
  }, [roomId, isHost]);

  // Clean up polling on unmount
  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // Host starts polling immediately
  useEffect(() => {
    if (isHost) startPolling();
  }, [isHost, startPolling]);

  // ---- GUEST PRIMER: one real click to unlock autoplay for the session ----
  const handlePrimer = async () => {
    const vid = videoRef.current;
    if (!vid) return;

    try {
      // Fetch current state inside the click handler
      const res = await fetch(`/api/sync?roomId=${roomId}`);
      const data = await res.json();

      if (data?.state) {
        const s = data.state;
        remoteState.current = s;
        lastSyncTimestamp.current = s.timestamp;

        // Calculate where the video should be right now
        const elapsed = (Date.now() - s.timestamp) / 1000;
        const targetTime = s.isPlaying ? s.time + elapsed : s.time;
        vid.currentTime = targetTime;

        if (s.isPlaying) {
          // This play() is inside a click handler → browser trusts it
          await vid.play().catch(() => {});
        }
      }
    } catch {}

    // Mark as primed and start polling
    setPrimed(true);
    startPolling();
  };

  // ---- HOST: push state to server ----
  const pushState = useCallback(async (isPlaying, time) => {
    if (!isHost) return;
    if (ignoreNextEvent.current) { ignoreNextEvent.current = false; return; }

    const state = { videoUrl, isPlaying, time, timestamp: Date.now() };
    remoteState.current = state;
    lastSyncTimestamp.current = state.timestamp;

    try {
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, state }),
      });
    } catch {}
  }, [roomId, videoUrl, isHost]);

  // ---- Host event handlers ----
  const onPlay = () => pushState(true, videoRef.current.currentTime);
  const onPause = () => pushState(false, videoRef.current.currentTime);
  const onSeeked = () => {
    if (ignoreNextEvent.current) { ignoreNextEvent.current = false; return; }
    pushState(!videoRef.current.paused, videoRef.current.currentTime);
  };

  return (
    <div className="w-full">
      {/* Ambient glow behind video */}
      <div className="relative">
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
                {/* Pulsing play button */}
                <div className="relative">
                  <div className="w-24 h-24 rounded-full flex items-center justify-center relative z-10"
                       style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))', boxShadow: '0 8px 40px rgba(139,92,246,.4)' }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="#fff" strokeWidth="0">
                      <polygon points="7 4 19 12 7 20 7 4"/>
                    </svg>
                  </div>
                  {/* Pulse ring */}
                  <div className="absolute inset-0 rounded-full animate-ping opacity-20"
                       style={{ background: 'var(--color-primary)' }} />
                </div>
                <div className="text-center">
                  <p className="text-white text-base font-semibold mb-1">Click to join the room</p>
                  <p className="text-sm text-muted">You&apos;ll sync with the host automatically</p>
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
          {isHost ? 'You control playback' : primed ? 'Synced with host' : 'Tap to connect'}
        </span>
      </div>
    </div>
  );
}
