'use client';

import { useEffect, useRef, useCallback } from 'react';

export default function VideoPlayer({ roomId, videoUrl, isHost }) {
  const videoRef = useRef(null);
  const ignoreNextEvent = useRef(false);
  const lastSyncTimestamp = useRef(0);
  const remoteState = useRef({ isPlaying: false, time: 0, timestamp: 0 });

  // ---- POLLING: fetch remote state and apply to guest ----
  useEffect(() => {
    if (!videoRef.current) return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/sync?roomId=${roomId}`);
        const data = await res.json();
        if (!data?.state) return;

        const remote = data.state;
        // Only act on newer state
        if (remote.timestamp <= lastSyncTimestamp.current) return;
        lastSyncTimestamp.current = remote.timestamp;
        remoteState.current = remote;

        const vid = videoRef.current;
        if (!vid) return;

        const timeDiff = Math.abs(vid.currentTime - remote.time);
        const playDiff = !vid.paused !== remote.isPlaying;

        if (timeDiff > 2 || playDiff) {
          ignoreNextEvent.current = true;

          if (timeDiff > 2) vid.currentTime = remote.time;

          if (remote.isPlaying && vid.paused) {
            vid.play().catch(() => {});
          } else if (!remote.isPlaying && !vid.paused) {
            vid.pause();
          }
        }
      } catch {}
    };

    const id = setInterval(poll, 1500);
    poll(); // initial check
    return () => clearInterval(id);
  }, [roomId]);

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

  // ---- Event handlers ----
  const onPlay  = () => {
    if (!isHost && !remoteState.current.isPlaying) {
      videoRef.current?.pause();
      return;
    }
    pushState(true, videoRef.current.currentTime);
  };

  const onPause = () => {
    if (!isHost && remoteState.current.isPlaying) {
      videoRef.current?.play().catch(() => {});
      return;
    }
    pushState(false, videoRef.current.currentTime);
  };

  const onSeeked = () => {
    if (!isHost) {
      videoRef.current.currentTime = remoteState.current.time;
      return;
    }
    pushState(!videoRef.current.paused, videoRef.current.currentTime);
  };

  return (
    <div className="w-full">
      {/* Video container */}
      <div className="glass overflow-hidden" style={{ padding: 0, borderRadius: 16, background: '#000' }}>
        <video
          ref={videoRef}
          src={videoUrl}
          controls={isHost}
          playsInline
          className="w-full block"
          style={{ maxHeight: '78vh', objectFit: 'contain', pointerEvents: isHost ? 'auto' : 'none' }}
          onPlay={onPlay}
          onPause={onPause}
          onSeeked={onSeeked}
        />
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-center gap-2 mt-3 text-xs text-muted">
        <span className="w-1.5 h-1.5 rounded-full"
              style={{ background: isHost ? 'var(--color-primary)' : 'var(--color-muted)' }}></span>
        {isHost ? 'You control playback' : 'Synced with host'}
      </div>
    </div>
  );
}
