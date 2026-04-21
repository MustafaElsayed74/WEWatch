'use client';

import { useEffect, useRef, useState } from 'react';

export default function VideoPlayer({ socket, roomId, videoUrl }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const ignoreNextEvent = useRef(false);

  useEffect(() => {
    if (!socket || !videoRef.current) return;

    // Listen for incoming socket events
    socket.on('play', () => {
      ignoreNextEvent.current = true;
      videoRef.current.play().catch(e => console.error("Play failed:", e));
      setIsPlaying(true);
    });

    socket.on('pause', () => {
      ignoreNextEvent.current = true;
      videoRef.current.pause();
      setIsPlaying(false);
    });

    socket.on('seek', (time) => {
      if (Math.abs(videoRef.current.currentTime - time) > 0.5) {
        ignoreNextEvent.current = true;
        videoRef.current.currentTime = time;
      }
    });

    socket.on('sync-request', (targetSocketId) => {
      if (videoRef.current) {
        socket.emit('sync-response', {
          targetSocketId,
          state: {
            time: videoRef.current.currentTime,
            isPlaying: !videoRef.current.paused
          }
        });
      }
    });

    socket.on('sync-update', (state) => {
      if (videoRef.current) {
        ignoreNextEvent.current = true;
        videoRef.current.currentTime = state.time;
        if (state.isPlaying) {
          videoRef.current.play().catch(e => console.error("Play failed:", e));
        }
      }
    });

    return () => {
      socket.off('play');
      socket.off('pause');
      socket.off('seek');
      socket.off('sync-request');
      socket.off('sync-update');
    };
  }, [socket]);

  // Video Event Handlers (Broadcast to others)
  const handlePlay = () => {
    if (ignoreNextEvent.current) {
      ignoreNextEvent.current = false;
      return;
    }
    socket.emit('play', roomId);
    setIsPlaying(true);
  };

  const handlePause = () => {
    if (ignoreNextEvent.current) {
      ignoreNextEvent.current = false;
      return;
    }
    socket.emit('pause', roomId);
    setIsPlaying(false);
  };

  const handleSeek = () => {
    if (ignoreNextEvent.current) {
      ignoreNextEvent.current = false;
      return;
    }
    if (videoRef.current) {
      socket.emit('seek', { roomId, time: videoRef.current.currentTime });
    }
  };

  return (
    <div className="w-full w-full relative animate-fade-in">
      <div className="glass-panel overflow-hidden" style={{ padding: 0, background: '#000', borderRadius: '16px' }}>
        <video
          ref={videoRef}
          src={videoUrl}
          controls
          className="w-full h-auto object-contain"
          style={{ maxHeight: '80vh', width: '100%', display: 'block', borderRadius: '16px' }}
          onPlay={handlePlay}
          onPause={handlePause}
          onSeeked={handleSeek}
        >
          Your browser does not support the video tag.
        </video>
      </div>
    </div>
  );
}
