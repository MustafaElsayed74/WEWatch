'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [joinRoomId, setJoinRoomId] = useState('');

  const createRoom = () => {
    // Generate a random 6-character room ID
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
    <main className="flex flex-col items-center justify-center min-h-screen p-4 animate-fade-in">
      <div className="glass-panel w-full max-w-md text-center">
        <h1 className="mb-4" style={{ fontSize: '2.5rem', background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', color: 'transparent' }}>
          WeWatch
        </h1>
        <p className="text-secondary mb-8">
          Watch movies in perfect sync with your friends, no matter where they are.
        </p>

        <div className="flex flex-col gap-4">
          <button onClick={createRoom} className="btn btn-primary w-full">
            Create a New Room
          </button>
          
          <div style={{ position: 'relative', margin: '1rem 0' }}>
            <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)' }} />
            <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'var(--bg-color)', padding: '0 10px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>or</span>
          </div>

          <form onSubmit={joinRoom} className="flex flex-col gap-4">
            <input 
              type="text" 
              placeholder="Enter Room ID" 
              className="input-field"
              value={joinRoomId}
              onChange={(e) => setJoinRoomId(e.target.value)}
              required
            />
            <button type="submit" className="btn btn-secondary w-full">
              Join Room
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
