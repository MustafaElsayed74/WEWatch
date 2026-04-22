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
    <div className="flex flex-col min-h-screen p-4 md:p-8 animate-fade-in relative">
      {/* Dynamic glow based on video state could go here, but for now a static ambient glow */}
      <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none"></div>

      <header className="flex justify-between items-center mb-8 glass-panel border-b-0 border-r-0 border-l-0 rounded-t-none mt-[-2rem] mx-[-1rem] md:mx-0 md:mt-0 md:rounded-2xl md:border" style={{ padding: '1rem 2rem' }}>
        <h2 className="text-2xl font-bold tracking-wider text-gradient-primary">WW</h2>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-[0.65rem] text-secondary font-mono tracking-widest uppercase mb-1">Session ID</span>
            <span className="font-mono bg-[#05050A] px-4 py-1.5 rounded-lg text-white border border-glass-border tracking-[0.2em] shadow-inner">
              {roomId}
            </span>
          </div>
          {isHost && (
            <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/30">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              <span className="text-xs text-primary font-bold tracking-wider">HOST</span>
            </div>
          )}
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center w-full max-w-6xl mx-auto relative z-10">
        {!videoUrl ? (
          <UploadModal roomId={roomId} setVideoUrl={setVideoUrl} />
        ) : !hasJoined ? (
          <div className="glass-panel text-center p-12 max-w-md w-full relative overflow-hidden group animate-slide-up">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none"></div>
            <div className="w-20 h-20 mx-auto bg-black/40 rounded-full flex items-center justify-center border border-glass-border mb-6 shadow-[0_0_30px_rgba(177,69,255,0.2)]">
              <svg className="w-8 h-8 text-primary ml-1" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 4l12 6-12 6z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold mb-4 text-white">Ready to Watch?</h2>
            <p className="text-secondary mb-10 text-sm leading-relaxed">
              The host controls the playback timeline. Grab your popcorn and sync up.
            </p>
            <button 
              className="btn btn-primary w-full text-lg py-4"
              onClick={() => setHasJoined(true)}
            >
              Join Session
            </button>
          </div>
        ) : (
          <VideoPlayer roomId={roomId} videoUrl={videoUrl} isHost={isHost} />
        )}
      </main>
    </div>
  );
}
