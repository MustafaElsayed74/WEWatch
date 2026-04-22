'use client';

import { useState } from 'react';
import { upload } from '@vercel/blob/client';

export default function UploadModal({ roomId, setVideoUrl }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) {
      uploadFile(file);
    } else {
      alert('Please upload a valid video file.');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) uploadFile(file);
  };

  const uploadFile = async (file) => {
    setIsUploading(true);
    setProgress(10);

    try {
      // Vercel Blob client-side upload
      const newBlob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/upload',
        onUploadProgress: (progressEvent) => {
          // Add basic progress tracking
          setProgress(Math.round(progressEvent.percentage || 50));
        },
      });

      // Once uploaded, we set the video URL
      sessionStorage.setItem('weWatchHost_' + roomId, 'true');
      setVideoUrl(newBlob.url);
      
      // We also update the sync state so the other person gets the video URL
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          state: {
            videoUrl: newBlob.url,
            isPlaying: false,
            time: 0,
            timestamp: Date.now()
          }
        })
      });

    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Upload failed: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="glass-panel w-full max-w-2xl text-center p-12 relative animate-slide-up">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary blur-[80px] opacity-20 -z-10"></div>
      
      <h2 className="text-3xl font-extrabold mb-3 text-white">Initialize Session</h2>
      <p className="text-secondary mb-10 text-sm tracking-wide">
        SELECT A MEDIA FILE TO BEGIN SYNCHRONIZATION
      </p>

      <div
        className={`relative border border-dashed rounded-3xl p-12 transition-all duration-500 flex flex-col items-center justify-center overflow-hidden ${
          isDragging 
            ? 'border-primary bg-primary/5 scale-[1.02]' 
            : 'border-glass-border bg-black/20 hover:border-primary/50 hover:bg-black/40'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{ minHeight: '320px' }}
      >
        {isDragging && (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent z-0"></div>
        )}

        {isUploading ? (
          <div className="flex flex-col items-center w-full max-w-sm z-10">
            <div className="w-16 h-16 relative mb-6">
              <div className="absolute inset-0 border-t-2 border-primary rounded-full animate-spin"></div>
              <div className="absolute inset-2 border-r-2 border-secondary rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
            </div>
            <div className="flex justify-between w-full mb-2 text-xs font-mono text-secondary tracking-widest">
              <span>UPLOADING</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-[#05050A] rounded-full h-1.5 overflow-hidden border border-glass-border">
              <div className="bg-gradient-to-r from-secondary to-primary h-full rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(177,69,255,0.5)]" style={{ width: `${progress}%` }}></div>
            </div>
          </div>
        ) : (
          <div className="z-10 flex flex-col items-center">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-transform duration-500 ${isDragging ? 'scale-110 shadow-[0_0_40px_rgba(177,69,255,0.3)]' : 'bg-black/30 shadow-inner'}`}>
              <svg className={`w-10 h-10 transition-colors duration-300 ${isDragging ? 'text-primary' : 'text-secondary'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
              </svg>
            </div>
            <p className="text-xl font-semibold mb-2 text-white">Drop your media here</p>
            <span className="text-xs text-secondary/60 mb-8 font-mono uppercase tracking-widest">Supports MP4, WEBM</span>
            <input
              type="file"
              id="fileInput"
              accept="video/*"
              className="hidden"
              onChange={handleFileSelect}
            />
            <label htmlFor="fileInput" className="btn btn-secondary cursor-pointer">
              Browse Files
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
