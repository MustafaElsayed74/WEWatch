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
      // Since Vercel Blob has strict CORS/Origin locking that causes 400 Bad Request
      // when the token doesn't match the exact linked Vercel project, we will use a 
      // free public temporary file host (tmpfiles.org) which is perfect for watch parties!
      const formData = new FormData();
      formData.append('file', file);

      // We use XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();
      xhr.open('POST', 'https://tmpfiles.org/api/v1/upload', true);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          setProgress(Math.round(percentComplete));
        }
      };

      xhr.onload = async function() {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          // tmpfiles returns URL like: https://tmpfiles.org/12345/video.mp4
          // Direct download link for streaming: https://tmpfiles.org/dl/12345/video.mp4
          const directUrl = response.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
          
          setVideoUrl(directUrl);
          
          // Update sync state
          await fetch('/api/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              roomId,
              state: {
                videoUrl: directUrl,
                isPlaying: false,
                time: 0,
                timestamp: Date.now()
              }
            })
          });
        } else {
          alert('Upload failed. Please try a different video.');
        }
        setIsUploading(false);
      };

      xhr.onerror = function() {
        alert('Upload error. Your network might be blocking the upload.');
        setIsUploading(false);
      };

      xhr.send(formData);

    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Upload failed: ' + error.message);
      setIsUploading(false);
    }
  };

  return (
    <div className="glass-panel w-full max-w-2xl text-center p-8">
      <h2 className="text-2xl mb-2">Upload Movie</h2>
      <p className="text-secondary mb-8">Select or drag & drop a video file to start watching together.</p>

      <div
        className={`border-2 border-dashed rounded-2xl p-12 transition-all duration-300 flex flex-col items-center justify-center ${
          isDragging ? 'border-primary bg-primary/10 scale-105' : 'border-glass-border bg-black/20'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{ minHeight: '300px' }}
      >
        {isUploading ? (
          <div className="flex flex-col items-center w-full max-w-xs">
            <div className="text-xl mb-4 text-primary animate-pulse">Uploading... {progress}%</div>
            <div className="w-full bg-gray-800 rounded-full h-2.5 mb-4 overflow-hidden">
              <div className="bg-primary h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
            </div>
          </div>
        ) : (
          <>
            <svg className="w-16 h-16 text-secondary mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
            </svg>
            <p className="text-lg mb-4">Drag and drop your video file here</p>
            <span className="text-sm text-secondary mb-6">Supports MP4, WEBM (No size limits!)</span>
            <input
              type="file"
              id="fileInput"
              accept="video/*"
              className="hidden"
              onChange={handleFileSelect}
            />
            <label htmlFor="fileInput" className="btn btn-primary cursor-pointer">
              Browse Files
            </label>
          </>
        )}
      </div>
    </div>
  );
}
