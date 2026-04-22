'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [joinRoomId, setJoinRoomId] = useState('');

  const createRoom = () => {
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
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="glass w-full max-w-sm p-10 animate-up" style={{ animationDelay: '.1s' }}>
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5"
               style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gradient mb-2">WeWatch</h1>
          <p className="text-muted text-sm">Watch together, anywhere.</p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-4">
          <button onClick={createRoom} className="btn btn-primary w-full">
            Create Room
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-1">
            <div className="flex-1 h-px bg-white/5"></div>
            <span className="text-muted text-xs font-mono uppercase tracking-widest">or</span>
            <div className="flex-1 h-px bg-white/5"></div>
          </div>

          <form onSubmit={joinRoom} className="flex flex-col gap-3">
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
              Join Room
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
