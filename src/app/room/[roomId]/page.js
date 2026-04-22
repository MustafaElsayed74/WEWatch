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

  useEffect(() => {
    setIsHost(sessionStorage.getItem('weWatchHost_' + roomId) === 'true');
  }, [roomId]);

  useEffect(() => {
    if (videoUrl) return;
    const check = async () => {
      try {
        const res = await fetch(`/api/sync?roomId=${roomId}`);
        const data = await res.json();
        if (data?.state?.videoUrl) setVideoUrl(data.state.videoUrl);
      } catch {} finally { setChecking(false); }
    };
    check();
    const id = setInterval(check, 2000);
    return () => clearInterval(id);
  }, [roomId, videoUrl]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Header ── */}
      <header className="glass flex items-center justify-between px-5 py-3.5 mx-3 mt-3 sm:mx-5 sm:mt-5" style={{ borderRadius: 16 }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
          </div>
          <span className="text-sm font-bold text-gradient tracking-wide hidden sm:inline">WeWatch</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Room badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
               style={{ background: 'rgba(0,0,0,.3)', border: '1px solid rgba(255,255,255,.04)' }}>
            <span className="text-[10px] text-muted font-mono uppercase tracking-widest">Room</span>
            <code className="text-xs font-mono tracking-[.15em] text-white font-semibold">{roomId}</code>
          </div>

          {/* Host badge */}
          {isHost && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider"
                 style={{ background: 'rgba(139,92,246,.12)', color: 'var(--color-primary-light)', border: '1px solid rgba(139,92,246,.15)' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--color-primary-light)' }}></span>
              Host
            </div>
          )}
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        {checking && !videoUrl ? (
          <div className="flex flex-col items-center gap-3 animate-in">
            <div className="w-8 h-8 rounded-full spinner" style={{ border: '2px solid rgba(255,255,255,.06)', borderTopColor: 'var(--color-primary)' }}></div>
            <span className="text-muted text-xs font-mono uppercase tracking-widest">Connecting</span>
          </div>
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
