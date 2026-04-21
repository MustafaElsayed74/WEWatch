'use client';

import { useState } from 'react';

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
    setProgress(10); // Fake progress start

    const formData = new FormData();
    formData.append('video', file);
    formData.append('roomId', roomId);

    try {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/upload', true);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          setProgress(Math.round(percentComplete));
        }
      };

      xhr.onload = function() {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          setVideoUrl(response.url);
        } else {
          alert('Upload failed.');
        }
        setIsUploading(false);
      };

      xhr.onerror = function() {
        alert('Upload error.');
        setIsUploading(false);
      };

      xhr.send(formData);
    } catch (error) {
      console.error('Error uploading file:', error);
      setIsUploading(false);
      alert('Upload failed.');
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
            <span className="text-sm text-secondary mb-6">Supports MP4, WEBM</span>
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
