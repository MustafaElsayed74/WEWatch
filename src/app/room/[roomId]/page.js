'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import UploadModal from '@/components/UploadModal';
import VideoPlayer from '@/components/VideoPlayer';

export default function RoomPage() {
  const params = useParams();
  const roomId = params.roomId;
  const [videoUrl, setVideoUrl] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [checking, setChecking] = useState(true);

  // Determine host status
  useEffect(() => {
    const hostStatus = sessionStorage.getItem('weWatchHost_' + roomId) === 'true';
    setIsHost(hostStatus);
  }, [roomId]);

  // Poll for room state (video URL) until found
  useEffect(() => {
    if (videoUrl) return;

    const checkVideo = async () => {
      try {
        const res = await fetch(`/api/sync?roomId=${roomId}`);
        const data = await res.json();
        if (data?.state?.videoUrl) {
          setVideoUrl(data.state.videoUrl);
        }
      } catch (err) {
        console.error('Failed to check room state', err);
      } finally {
        setChecking(false);
      }
    };

    checkVideo();
    const interval = setInterval(checkVideo, 2000);
    return () => clearInterval(interval);
  }, [roomId, videoUrl]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="glass flex items-center justify-between px-6 py-4 mx-4 mt-4" style={{ borderRadius: 16 }}>
        <span className="text-lg font-bold text-gradient">WeWatch</span>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-muted text-xs font-mono">ROOM</span>
            <code className="text-sm font-mono tracking-widest text-white bg-black/30 px-3 py-1 rounded-lg">
              {roomId}
            </code>
          </div>
          {isHost && (
            <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg"
                  style={{ background: 'rgba(168,85,247,.15)', color: 'var(--color-primary)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-primary" style={{ animation: 'pulse 2s infinite' }}></span>
              HOST
            </span>
          )}
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center p-6">
        {checking && !videoUrl ? (
          <div className="text-muted text-sm animate-up">Connecting to room…</div>
        ) : !videoUrl ? (
          <UploadModal roomId={roomId} setVideoUrl={setVideoUrl} />
        ) : (
          <div className="w-full max-w-5xl animate-up">
            <VideoPlayer roomId={roomId} videoUrl={videoUrl} isHost={isHost} />
          </div>
        )}
      </main>
    </div>
  );
}
