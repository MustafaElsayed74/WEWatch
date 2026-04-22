'use client';

import { useState } from 'react';

export default function UploadModal({ roomId, setVideoUrl }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState('');

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) uploadFile(file);
    else alert('Please drop a video file.');
  };
  const handleFileSelect = (e) => { const f = e.target.files[0]; if (f) uploadFile(f); };

  const uploadFile = async (file) => {
    setIsUploading(true); setProgress(5); setFileName(file.name);

    try {
      // 1. Get presigned URL from our API
      const presignRes = await fetch(
        `/api/upload?filename=${encodeURIComponent(file.name)}&contentType=${encodeURIComponent(file.type)}`
      );
      const { uploadUrl, streamUrl, key } = await presignRes.json();
      if (!uploadUrl) throw new Error('Failed to get upload URL');

      setProgress(10);

      // 2. Upload directly to B2 using presigned URL with progress tracking
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type);

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setProgress(10 + Math.round((e.loaded / e.total) * 85));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload failed: ${xhr.status}`));
        };

        xhr.onerror = () => reject(new Error('Upload failed'));
        xhr.send(file);
      });

      setProgress(98);

      // 3. Mark as host + save state
      sessionStorage.setItem('weWatchHost_' + roomId, 'true');

      // Use our streaming proxy URL (proper headers, no CORS, supports seeking)
      const videoUrl = `/api/stream?key=${encodeURIComponent(key)}`;

      await fetch('/api/pusher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          state: { videoUrl, videoKey: key, isPlaying: false, time: 0, timestamp: Date.now() },
        }),
      });

      setProgress(100);
      setVideoUrl(videoUrl);
    } catch (err) {
      console.error('Upload error:', err);
      alert('Upload failed: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="glass glass-glow w-full max-w-lg p-10 animate-up">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-4"
             style={{ background: 'rgba(139,92,246,.1)', border: '1px solid rgba(139,92,246,.12)' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary-light)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white mb-1">Upload a movie</h2>
        <p className="text-muted text-sm">Up to 5GB — share something to watch together</p>
      </div>

      <div
        className="relative rounded-2xl flex flex-col items-center justify-center text-center transition-all duration-300 group"
        style={{
          minHeight: 220, padding: '2rem',
          border: `1px dashed ${isDragging ? 'var(--color-primary)' : 'rgba(255,255,255,.06)'}`,
          background: isDragging ? 'rgba(139,92,246,.04)' : 'rgba(0,0,0,.15)',
        }}
        onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
      >
        {isUploading ? (
          <div className="w-full max-w-xs animate-in">
            <div className="w-10 h-10 mx-auto mb-4 rounded-full spinner"
                 style={{ border: '2px solid rgba(255,255,255,.06)', borderTopColor: 'var(--color-primary)' }}></div>
            <p className="text-white text-sm font-medium mb-1 truncate max-w-[200px] mx-auto">{fileName}</p>
            <div className="flex justify-between text-[10px] font-mono text-muted tracking-widest mb-2 mt-3">
              <span>UPLOADING</span><span>{progress}%</span>
            </div>
            <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,.04)' }}>
              <div className="h-full rounded-full transition-all duration-500 ease-out"
                   style={{ width: `${progress}%`, background: 'linear-gradient(90deg, var(--color-primary), var(--color-accent))' }} />
            </div>
          </div>
        ) : (
          <div className="animate-in">
            <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110"
                 style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.05)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted" style={{ transition: 'color .3s' }}>
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <p className="text-white text-sm font-medium mb-1">Drop your video here</p>
            <p className="text-muted text-xs mb-5">MP4, WEBM — up to 5GB</p>
            <input type="file" id="fileInput" accept="video/*" className="hidden" onChange={handleFileSelect} />
            <label htmlFor="fileInput" className="btn btn-outline text-xs cursor-pointer">Browse files</label>
          </div>
        )}
      </div>
    </div>
  );
}
