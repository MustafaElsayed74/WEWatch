'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import UploadModal from '@/components/UploadModal';
import VideoPlayer from '@/components/VideoPlayer';

export default function RoomPage() {
  const params = useParams();
  const roomId = params.roomId;
  const [videoUrl, setVideoUrl] = useState(null);
  const [hasJoined, setHasJoined] = useState(false);
  const [isHost, setIsHost] = useState(false);

  useEffect(() => {
    // Check if the current user is the host
    const hostStatus = sessionStorage.getItem('weWatchHost_' + roomId) === 'true';
    setIsHost(hostStatus);
    if (hostStatus) setHasJoined(true);
  }, [roomId]);

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
          {isHost && <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">HOST</span>}
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center w-full max-w-5xl mx-auto">
        {!videoUrl ? (
          <UploadModal roomId={roomId} setVideoUrl={setVideoUrl} />
        ) : !hasJoined ? (
          <div className="glass-panel text-center p-12 max-w-md w-full">
            <h2 className="text-2xl mb-4 text-primary">Ready to Watch?</h2>
            <p className="text-secondary mb-8">The host controls the playback. Grab your popcorn and join the room!</p>
            <button 
              className="btn btn-primary w-full text-lg py-3"
              onClick={() => setHasJoined(true)}
            >
              Join Watch Party
            </button>
          </div>
        ) : (
          <VideoPlayer roomId={roomId} videoUrl={videoUrl} isHost={isHost} />
        )}
      </main>
    </div>
  );
}
