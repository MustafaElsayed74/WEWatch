'use client';

import { useEffect, useRef, useState } from 'react';

export default function VideoPlayer({ roomId, videoUrl, isHost }) {
  const videoRef = useRef(null);
  const ignoreNextEvent = useRef(false);
  const lastSyncTime = useRef(0);
  const localState = useRef({ isPlaying: false, time: 0, timestamp: 0 });

  useEffect(() => {
    if (!videoRef.current) return;

    const pollSync = async () => {
      try {
        const res = await fetch(`/api/sync?roomId=${roomId}`);
        const data = await res.json();
        
        if (data?.state) {
          const remoteState = data.state;
          
          // Only sync if the remote state is newer than our last known remote state
          if (remoteState.timestamp > lastSyncTime.current) {
            lastSyncTime.current = remoteState.timestamp;
            localState.current = remoteState;
            
            // Check if remote state differs significantly from local state
            const timeDiff = Math.abs(videoRef.current.currentTime - remoteState.time);
            const isPlayingDiff = !videoRef.current.paused !== remoteState.isPlaying;

            if (timeDiff > 1.5 || isPlayingDiff) {
              ignoreNextEvent.current = true;
              
              if (timeDiff > 1.5) {
                videoRef.current.currentTime = remoteState.time;
              }
              
              if (remoteState.isPlaying && videoRef.current.paused) {
                videoRef.current.play().catch(e => console.error("Play failed (Autoplay blocked?):", e));
              } else if (!remoteState.isPlaying && !videoRef.current.paused) {
                videoRef.current.pause();
              }
            }
          }
        }
      } catch (err) {
        console.error("Poll failed", err);
      }
    };

    // Poll every 2 seconds
    const interval = setInterval(pollSync, 2000);
    return () => clearInterval(interval);
  }, [roomId]);

  const updateRemoteState = async (isPlaying, time) => {
    if (!isHost) return; // Only host can update remote state
    if (ignoreNextEvent.current) {
      ignoreNextEvent.current = false;
      return;
    }
    
    const newState = {
      videoUrl,
      isPlaying,
      time,
      timestamp: Date.now()
    };
    
    localState.current = newState;
    lastSyncTime.current = newState.timestamp;

    try {
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, state: newState })
      });
    } catch (err) {
      console.error("Failed to update remote state", err);
    }
  };

  const handlePlay = (e) => {
    if (!isHost) {
      // Guests cannot play. Revert to remote state.
      if (!localState.current.isPlaying) {
        videoRef.current.pause();
      }
      return;
    }
    updateRemoteState(true, videoRef.current.currentTime);
  };

  const handlePause = (e) => {
    if (!isHost) {
      // Guests cannot pause. Revert to remote state.
      if (localState.current.isPlaying) {
        videoRef.current.play().catch(err => console.error(err));
      }
      return;
    }
    updateRemoteState(false, videoRef.current.currentTime);
  };

  const handleSeek = (e) => {
    if (!isHost) {
      // Guests cannot seek. Revert to remote state.
      videoRef.current.currentTime = localState.current.time;
      return;
    }
    updateRemoteState(!videoRef.current.paused, videoRef.current.currentTime);
  };

  return (
    <div className="w-full relative animate-fade-in">
      <div className={`glass-panel overflow-hidden ${!isHost ? 'pointer-events-none' : ''}`} style={{ padding: 0, background: '#000', borderRadius: '16px' }}>
        <video
          ref={videoRef}
          src={videoUrl}
          controls={isHost} // Only host sees native controls
          className="w-full h-auto object-contain pointer-events-auto"
          style={{ maxHeight: '80vh', width: '100%', display: 'block', borderRadius: '16px' }}
          onPlay={handlePlay}
          onPause={handlePause}
          onSeeked={handleSeek}
        >
          Your browser does not support the video tag.
        </video>
      </div>
      <div className="text-center mt-4 text-xs text-secondary opacity-50 flex items-center justify-center gap-2">
        <span className={`w-2 h-2 rounded-full ${isHost ? 'bg-primary' : 'bg-gray-500'}`}></span>
        {isHost ? 'You are controlling the room' : 'Host controls playback'}
      </div>
    </div>
  );
}
