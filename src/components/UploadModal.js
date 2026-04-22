'use client';

import { useState } from 'react';
import { upload } from '@vercel/blob/client';

export default function UploadModal({ roomId, setVideoUrl }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) uploadFile(file);
    else alert('Please drop a video file.');
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) uploadFile(file);
  };

  const uploadFile = async (file) => {
    setIsUploading(true);
    setProgress(5);

    try {
      const newBlob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/upload',
        onUploadProgress: (evt) => {
          setProgress(Math.round(evt.percentage || 50));
        },
      });

      // Mark self as host
      sessionStorage.setItem('weWatchHost_' + roomId, 'true');
      setVideoUrl(newBlob.url);

      // Save room state
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          state: { videoUrl: newBlob.url, isPlaying: false, time: 0, timestamp: Date.now() },
        }),
      });
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="glass w-full max-w-lg p-10 animate-up">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Upload a Movie</h2>
        <p className="text-muted text-sm">Drop a video file to start watching together.</p>
      </div>

      <div
        className="relative rounded-2xl p-10 flex flex-col items-center justify-center text-center transition-all duration-300"
        style={{
          minHeight: 240,
          border: `1px dashed ${isDragging ? 'var(--color-primary)' : 'rgba(255,255,255,.08)'}`,
          background: isDragging ? 'rgba(168,85,247,.04)' : 'rgba(0,0,0,.2)',
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isUploading ? (
          <div className="w-full max-w-xs">
            {/* Spinner */}
            <div className="w-12 h-12 mx-auto mb-5 rounded-full spinner"
                 style={{ border: '2px solid rgba(255,255,255,.06)', borderTopColor: 'var(--color-primary)' }}></div>
            <div className="flex justify-between text-xs font-mono text-muted mb-2">
              <span>UPLOADING</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,.4)' }}>
              <div className="h-full rounded-full transition-all duration-300"
                   style={{ width: `${progress}%`, background: 'linear-gradient(90deg, var(--color-accent), var(--color-primary))' }}></div>
            </div>
          </div>
        ) : (
          <>
            <div className="w-14 h-14 rounded-full flex items-center justify-center mb-5"
                 style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <p className="text-white font-medium mb-1">Drop your video here</p>
            <p className="text-muted text-xs mb-6">MP4, WEBM — any size</p>
            <input type="file" id="fileInput" accept="video/*" className="hidden" onChange={handleFileSelect} />
            <label htmlFor="fileInput" className="btn btn-outline text-sm cursor-pointer">
              Browse Files
            </label>
          </>
        )}
      </div>
    </div>
  );
}
