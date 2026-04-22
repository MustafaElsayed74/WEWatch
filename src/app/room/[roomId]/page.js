'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import UploadModal from '@/components/UploadModal';
import VideoPlayer from '@/components/VideoPlayer';

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId;
  const [videoUrl, setVideoUrl] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [checking, setChecking] = useState(true);
  const [closing, setClosing] = useState(false);
  const [roomClosed, setRoomClosed] = useState(false);

  // Re-check host status whenever videoUrl changes
  useEffect(() => {
    setIsHost(sessionStorage.getItem('weWatchHost_' + roomId) === 'true');
  }, [roomId, videoUrl]);

  const handleVideoUrl = useCallback((url) => {
    setIsHost(sessionStorage.getItem('weWatchHost_' + roomId) === 'true');
    setVideoUrl(url);
  }, [roomId]);

  // Poll for room state until found — also detect room closure for guests
  useEffect(() => {
    if (roomClosed) return;
    const check = async () => {
      try {
        const res = await fetch(`/api/sync?roomId=${roomId}`);
        const data = await res.json();
        if (data?.state?.videoUrl) {
          setVideoUrl(data.state.videoUrl);
        } else if (videoUrl && !data?.state) {
          // Room was deleted (host closed it)
          setRoomClosed(true);
        }
      } catch {} finally { setChecking(false); }
    };
    check();
    const id = setInterval(check, 2000);
    return () => clearInterval(id);
  }, [roomId, videoUrl, roomClosed]);

  // Close room handler (host only)
  const handleCloseRoom = async () => {
    if (!confirm('Close this room? The video will be deleted.')) return;
    setClosing(true);
    try {
      await fetch('/api/close-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId }),
      });
      sessionStorage.removeItem('weWatchHost_' + roomId);
      router.push('/');
    } catch {
      alert('Failed to close room');
      setClosing(false);
    }
  };

  // Room closed screen for guests
  if (roomClosed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass glass-glow p-10 text-center max-w-sm animate-up">
          <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-5"
               style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.15)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Room closed</h2>
          <p className="text-muted text-sm mb-6">The host has ended this session</p>
          <button onClick={() => router.push('/')} className="btn btn-primary w-full">
            Back to home
          </button>
        </div>
      </div>
    );
  }

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
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
               style={{ background: 'rgba(0,0,0,.3)', border: '1px solid rgba(255,255,255,.04)' }}>
            <span className="text-[10px] text-muted font-mono uppercase tracking-widest">Room</span>
            <code className="text-xs font-mono tracking-[.15em] text-white font-semibold">{roomId}</code>
          </div>

          {isHost && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider"
                 style={{ background: 'rgba(139,92,246,.12)', color: 'var(--color-primary-light)', border: '1px solid rgba(139,92,246,.15)' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--color-primary-light)' }}></span>
              Host
            </div>
          )}

          {/* Close room button — host only */}
          {isHost && videoUrl && (
            <button
              onClick={handleCloseRoom}
              disabled={closing}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold uppercase tracking-wider cursor-pointer transition-all duration-200 hover:scale-105"
              style={{ background: 'rgba(239,68,68,.1)', color: '#f87171', border: '1px solid rgba(239,68,68,.15)' }}
            >
              {closing ? (
                <span className="w-3 h-3 rounded-full spinner" style={{ border: '1.5px solid rgba(248,113,113,.3)', borderTopColor: '#f87171' }}></span>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              )}
              {closing ? 'Closing…' : 'Close'}
            </button>
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
          <UploadModal roomId={roomId} setVideoUrl={handleVideoUrl} />
        ) : (
          <div className="w-full max-w-5xl animate-up">
            <VideoPlayer roomId={roomId} videoUrl={videoUrl} isHost={isHost} />
          </div>
        )}
      </main>
    </div>
  );
}
