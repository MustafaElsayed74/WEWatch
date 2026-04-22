'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

export default function VideoPlayer({ roomId, videoUrl, isHost }) {
  const videoRef = useRef(null);
  const ignoreNextEvent = useRef(false);
  const lastSyncTimestamp = useRef(0);
  const remoteState = useRef({ isPlaying: false, time: 0, timestamp: 0 });
  const [needsPlayClick, setNeedsPlayClick] = useState(false);

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

        // Host doesn't need to react to remote state — they ARE the source
        if (isHost) return;

        const vid = videoRef.current;
        if (!vid) return;

        // Sync time
        const timeDiff = Math.abs(vid.currentTime - remote.time);
        if (timeDiff > 2) {
          ignoreNextEvent.current = true;
          vid.currentTime = remote.time;
        }

        // Sync play/pause
        if (remote.isPlaying && vid.paused) {
          // Show the play button overlay — guest must click it (browser requirement)
          setNeedsPlayClick(true);
        } else if (!remote.isPlaying && !vid.paused) {
          ignoreNextEvent.current = true;
          vid.pause();
          setNeedsPlayClick(false);
        }
      } catch {}
    };

    const id = setInterval(poll, 1500);
    poll();
    return () => clearInterval(id);
  }, [roomId, isHost]);

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

  // ---- Guest: click-to-play handler (this IS a user gesture, so it works) ----
  const handleGuestPlay = () => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.currentTime = remoteState.current.time;
    vid.play().then(() => {
      setNeedsPlayClick(false);
    }).catch(() => {
      // Last resort: try muted
      vid.muted = true;
      vid.play().then(() => setNeedsPlayClick(false)).catch(() => {});
    });
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
          style={{ maxHeight: '78vh', objectFit: 'contain' }}
          onPlay={isHost ? onPlay : undefined}
          onPause={isHost ? onPause : undefined}
          onSeeked={isHost ? onSeeked : undefined}
        />

        {/* Guest play overlay — this is the practical solution to autoplay blocking */}
        {!isHost && needsPlayClick && (
          <div
            className="absolute inset-0 flex items-center justify-center cursor-pointer"
            style={{ background: 'rgba(0,0,0,.6)', zIndex: 10 }}
            onClick={handleGuestPlay}
          >
            <div className="flex flex-col items-center gap-4">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{
                  background: 'var(--color-primary)',
                  boxShadow: '0 0 40px rgba(168,85,247,.5)',
                }}
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="#fff" strokeWidth="0">
                  <polygon points="6 3 20 12 6 21 6 3"/>
                </svg>
              </div>
              <span className="text-white text-sm font-medium">Host pressed play — tap to sync</span>
            </div>
          </div>
        )}

        {/* Guest paused state indicator */}
        {!isHost && !needsPlayClick && videoRef.current?.paused && (
          <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
               style={{ background: 'rgba(0,0,0,.7)', color: 'var(--color-muted)', zIndex: 5, pointerEvents: 'none' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
            Waiting for host to play
          </div>
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
