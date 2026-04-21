'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import UploadModal from '@/components/UploadModal';
import VideoPlayer from '@/components/VideoPlayer';

export default function RoomPage() {
  const params = useParams();
  const roomId = params.roomId;
  const [videoUrl, setVideoUrl] = useState(null);

  useEffect(() => {
    // Poll for videoUrl if it's not set
    if (videoUrl) return;

    const checkVideo = async () => {
      try {
        const res = await fetch(`/api/sync?roomId=${roomId}`);
        const data = await res.json();
        if (data?.state?.videoUrl) {
          setVideoUrl(data.state.videoUrl);
        }
      } catch (err) {
        console.error("Failed to check room state", err);
      }
    };

    checkVideo();
    const interval = setInterval(checkVideo, 2000); // Check every 2 seconds

    return () => clearInterval(interval);
  }, [roomId, videoUrl]);

  return (
    <div className="flex flex-col min-h-screen p-4 md:p-8 animate-fade-in">
      <header className="flex justify-between items-center mb-8 glass-panel" style={{ padding: '1rem 2rem' }}>
        <h2 className="text-xl font-semibold">WeWatch</h2>
        <div className="flex items-center gap-4">
          <span className="text-secondary text-sm">Room ID:</span>
          <span className="font-mono bg-black/30 px-3 py-1 rounded-md text-primary tracking-wider font-bold">
            {roomId}
          </span>
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center w-full max-w-5xl mx-auto">
        {!videoUrl ? (
          <UploadModal roomId={roomId} setVideoUrl={setVideoUrl} />
        ) : (
          <VideoPlayer roomId={roomId} videoUrl={videoUrl} />
        )}
      </main>
    </div>
  );
}
