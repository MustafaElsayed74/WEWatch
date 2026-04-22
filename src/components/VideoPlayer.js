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
      <div className="glass overflow-hidden relative" style={{ padding: 0, borderRadius: 16, background: '#000' }}>
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

        {/* Guest priming overlay — shown ONCE before any play attempt */}
        {!isHost && !primed && (
          <div
            className="absolute inset-0 flex items-center justify-center cursor-pointer"
            style={{ background: 'rgba(0,0,0,.75)', zIndex: 10 }}
            onClick={handlePrimer}
          >
            <div className="flex flex-col items-center gap-5">
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                  boxShadow: '0 0 60px rgba(168,85,247,.4)',
                }}
              >
                <svg width="36" height="36" viewBox="0 0 24 24" fill="#fff" strokeWidth="0">
                  <polygon points="6 3 20 12 6 21 6 3"/>
                </svg>
              </div>
              <span className="text-white text-base font-semibold">Click to join the room</span>
              <span className="text-sm" style={{ color: 'var(--color-muted)' }}>You&apos;ll sync with the host automatically</span>
            </div>
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-center gap-2 mt-3 text-xs text-muted">
        <span className="w-1.5 h-1.5 rounded-full"
              style={{ background: isHost ? 'var(--color-primary)' : 'var(--color-muted)' }}></span>
        {isHost ? 'You control playback' : primed ? 'Synced with host' : 'Click above to join'}
      </div>
    </div>
  );
}
