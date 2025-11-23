
import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';

interface CameraFeedProps {
  onStreamReady?: (stream: MediaStream) => void;
  onError?: (error: string) => void;
  facingMode?: 'user' | 'environment';
}

export interface CameraHandle {
  captureFrame: () => string | null;
}

const CameraFeed = forwardRef<CameraHandle, CameraFeedProps>(({ onStreamReady, onError, facingMode = 'user' }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useImperativeHandle(ref, () => ({
    captureFrame: () => {
      const video = videoRef.current;
      // CRITICAL FIX: Check if video is actually ready and has dimensions
      // readyState 2 means HAVE_CURRENT_DATA
      if (!video || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
        return null;
      }
      
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      
      ctx.drawImage(video, 0, 0);
      // Reduce quality to 0.6 to save bandwidth/processing time
      const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
      
      // Double check we didn't get an empty frame (browsers sometimes return "data:," on error)
      if (dataUrl === "data:," || dataUrl.length < 100) return null;
      
      return dataUrl;
    }
  }));

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      // Clean up previous stream if exists (crucial for switching cameras)
      if (videoRef.current && videoRef.current.srcObject) {
         const oldStream = videoRef.current.srcObject as MediaStream;
         oldStream.getTracks().forEach(track => track.stop());
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facingMode, // Use the prop to decide camera
            width: { ideal: 640 },
            height: { ideal: 480 }
          },
          audio: false
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Ensure video plays on mobile (iOS requires playsInline to be set in JSX)
          await videoRef.current.play().catch(e => console.error("Play error:", e));
          
          if (onStreamReady) onStreamReady(stream);
        }
      } catch (err) {
        console.error("Camera access error:", err);
        if (onError) onError("无法访问摄像头，请检查权限设置。");
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [onError, onStreamReady, facingMode]); // Re-run when facingMode changes

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden rounded-2xl shadow-inner">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
        style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }} // Only mirror front camera
      />
    </div>
  );
});

CameraFeed.displayName = 'CameraFeed';
export default CameraFeed;
