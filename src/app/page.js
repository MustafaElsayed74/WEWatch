'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [joinRoomId, setJoinRoomId] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const createRoom = () => {
    setIsCreating(true);
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    router.push(`/room/${roomId}`);
  };

  const joinRoom = (e) => {
    e.preventDefault();
    if (joinRoomId.trim()) {
      router.push(`/room/${joinRoomId.trim().toUpperCase()}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative">
      {/* Decorative orbs */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full opacity-[0.04] blur-3xl pointer-events-none"
           style={{ background: 'var(--color-primary)' }} />
      <div className="absolute bottom-1/4 right-1/4 w-60 h-60 rounded-full opacity-[0.03] blur-3xl pointer-events-none"
           style={{ background: 'var(--color-accent)' }} />

      <div className="w-full max-w-sm stagger">
        {/* Brand */}
        <div className="text-center mb-12 animate-up">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6 relative"
               style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))', boxShadow: '0 8px 32px rgba(139,92,246,.3)' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            {/* Glow ring */}
            <div className="absolute -inset-1 rounded-[18px] opacity-40 blur-md -z-10"
                 style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))' }} />
          </div>
          <h1 className="text-4xl font-bold text-gradient mb-2 tracking-tight">WeWatch</h1>
          <p className="text-muted text-sm">Synchronized cinema for friends</p>
        </div>

        {/* Card */}
        <div className="glass glass-glow p-8 animate-up">
          <div className="flex flex-col gap-4 stagger">
            <button
              onClick={createRoom}
              disabled={isCreating}
              className="btn btn-primary w-full animate-up"
            >
              {isCreating ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white spinner"></span>
                  Creating…
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Create Room
                </>
              )}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-4 my-1 animate-up">
              <div className="divider flex-1"></div>
              <span className="text-muted text-[11px] font-mono uppercase tracking-[.2em]">or join</span>
              <div className="divider flex-1"></div>
            </div>

            <form onSubmit={joinRoom} className="flex flex-col gap-3 animate-up">
              <input
                type="text"
                placeholder="ROOM ID"
                className="input"
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                maxLength={6}
                required
              />
              <button type="submit" className="btn btn-outline w-full">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
                </svg>
                Join Room
              </button>
            </form>
          </div>
        </div>

        <p className="text-center text-muted/40 text-[11px] mt-8 animate-up">End-to-end synchronized playback</p>
      </div>
    </div>
  );
}
