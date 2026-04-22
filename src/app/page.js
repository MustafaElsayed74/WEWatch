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
      <div className="absolute top-8 left-8 text-2xl font-bold tracking-wider text-gradient-primary">WW</div>
      
      <div className="glass-panel w-full max-w-md text-center p-10 animate-slide-up relative">
        {/* Glow effect behind the panel */}
        <div className="absolute -inset-1 bg-gradient-to-r from-primary to-secondary blur-lg opacity-20 -z-10 rounded-[30px]"></div>

        <h1 className="text-5xl font-extrabold mb-4 text-gradient">
          WeWatch
        </h1>
        <p className="text-secondary mb-10 text-sm tracking-wide">
          SYNCHRONIZED CINEMA EXPERIENCES
        </p>

        <div className="flex flex-col gap-6">
          <button onClick={createRoom} className="btn btn-primary w-full group">
            <span className="relative z-10">Create Premium Room</span>
            <div className="absolute inset-0 bg-gradient-to-r from-secondary to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </button>
          
          <div className="relative my-2">
            <hr className="border-t border-glass-border" />
            <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-[#12121A] px-4 text-xs text-secondary font-mono tracking-widest uppercase rounded-full border border-glass-border">or join existing</span>
          </div>

          <form onSubmit={joinRoom} className="flex flex-col gap-4 relative">
            <input 
              type="text" 
              placeholder="ENTER ROOM ID" 
              className="input-premium text-center tracking-[0.2em] font-bold placeholder-gray-600 uppercase"
              value={joinRoomId}
              onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
              maxLength={6}
              required
            />
            <button type="submit" className="btn btn-secondary w-full">
              Access Room
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
