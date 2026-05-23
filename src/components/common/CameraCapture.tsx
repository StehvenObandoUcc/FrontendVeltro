import React, { useRef, useCallback } from 'react';
import { Camera, X, Loader2 } from 'lucide-react';
import { useCameraStream } from '../../hooks/useCameraStream';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onCancel: () => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const { cameraActive, cameraError, isCameraInitializing, stopCamera } = useCameraStream({
    videoRef
  });

  const handleCapture = useCallback(() => {
    if (!videoRef.current || !cameraActive) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
      stopCamera();
      onCapture(file);
    }, 'image/jpeg', 0.92);
  }, [cameraActive, onCapture, stopCamera]);

  const handleCancel = useCallback(() => {
    stopCamera();
    onCancel();
  }, [onCancel, stopCamera]);

  return (
    <div className="relative w-full overflow-hidden rounded-xl bg-black flex flex-col" style={{ aspectRatio: '4 / 3' }}>
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        playsInline
        muted
        autoPlay
      />
      
      {!cameraActive && !cameraError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-10">
          <div className="flex flex-col items-center">
            <Loader2 className="w-8 h-8 animate-spin text-white mb-2" />
            <span className="text-white text-sm">Iniciando cámara...</span>
          </div>
        </div>
      )}

      {cameraError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-10 text-white p-4 text-center">
          <p className="text-red-400 font-semibold mb-2">Error de cámara</p>
          <p className="text-sm">{cameraError}</p>
          <button 
            type="button"
            onClick={handleCancel}
            className="mt-4 px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Overlays / Buttons */}
      <div className="absolute top-2 right-2 z-20">
        <button
          type="button"
          onClick={handleCancel}
          className="p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="absolute bottom-4 inset-x-0 flex justify-center z-20">
        <button
          type="button"
          onClick={handleCapture}
          disabled={!cameraActive || isCameraInitializing}
          className="w-16 h-16 rounded-full border-4 border-white bg-white/30 hover:bg-white/50 flex items-center justify-center transition-colors disabled:opacity-50"
        >
          <Camera className="w-6 h-6 text-white shadow-sm" />
        </button>
      </div>
    </div>
  );
};
