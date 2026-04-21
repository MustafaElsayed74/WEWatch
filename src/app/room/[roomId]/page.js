'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { io } from 'socket.io-client';
import UploadModal from '@/components/UploadModal';
import VideoPlayer from '@/components/VideoPlayer';

export default function RoomPage() {
  const params = useParams();
  const roomId = params.roomId;
  const [socket, setSocket] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [isHost, setIsHost] = useState(false);

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('connect', () => {
      newSocket.emit('join-room', roomId);
    });

    newSocket.on('video-uploaded', (url) => {
      setVideoUrl(url);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [roomId]);

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
          <VideoPlayer socket={socket} roomId={roomId} videoUrl={videoUrl} />
        )}
      </main>
    </div>
  );
}
