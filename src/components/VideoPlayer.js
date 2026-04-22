'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

export default function VideoPlayer({ roomId, videoUrl, isHost }) {
  const videoRef = useRef(null);
  const ignoreNextEvent = useRef(false);
  const lastSyncTimestamp = useRef(0);
  const remoteState = useRef({ isPlaying: false, time: 0, timestamp: 0 });
  const [muted, setMuted] = useState(!isHost); // guests start muted to allow autoplay

  // ---- GUEST: warm up autoplay on mount ----
  useEffect(() => {
    if (isHost || !videoRef.current) return;

    const vid = videoRef.current;
    // Browsers allow autoplay if muted. Start muted, then let user unmute.
    vid.muted = true;
    vid.play().then(() => {
      // Autoplay succeeded muted — now try unmuting after a short delay
      setTimeout(() => {
        vid.muted = false;
        setMuted(false);
      }, 500);
    }).catch(() => {
      // Even muted autoplay failed — user will need to click unmute
      console.warn('Autoplay blocked even when muted');
    });
  }, [isHost]);

  // ---- POLLING: fetch remote state and apply ----
  useEffect(() => {
    if (!videoRef.current) return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/sync?roomId=${roomId}`);
        const data = await res.json();
        if (!data?.state) return;

        const remote = data.state;
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
            // Try unmuted first, fall back to muted
            vid.play().catch(() => {
              vid.muted = true;
              setMuted(true);
              vid.play().catch(() => {});
            });
          } else if (!remote.isPlaying && !vid.paused) {
            vid.pause();
          }
        }
      } catch {}
    };

    const id = setInterval(poll, 1500);
    poll();
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
  const onPlay = () => {
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

  // Guest unmute handler
  const handleUnmute = () => {
    if (videoRef.current) {
      videoRef.current.muted = false;
      setMuted(false);
    }
  };

  return (
    <div className="w-full">
      {/* Video container */}
      <div className="glass overflow-hidden relative" style={{ padding: 0, borderRadius: 16, background: '#000' }}>
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

        {/* Guest unmute banner */}
        {!isHost && muted && (
          <button
            onClick={handleUnmute}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium cursor-pointer"
            style={{
              background: 'rgba(168,85,247,.9)',
              color: '#fff',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,.2)',
              zIndex: 10,
              pointerEvents: 'auto',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <line x1="23" y1="9" x2="17" y2="15"/>
              <line x1="17" y1="9" x2="23" y2="15"/>
            </svg>
            Tap to unmute
          </button>
        )}
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
