import { useEffect, useRef } from 'react';
import { useAiScanStore } from '../stores/aiScanStore';
import { samMaskCache } from '../workers/samMaskCache';
import { segmentWithAI } from '../api/aiScannerApi';

const PROCESS_INTERVAL_MS = 3000; // 3 seconds throttle for SAM 2 encoder execution

export const useSamSegmentation = (
  videoRef: React.RefObject<HTMLVideoElement>,
  active: boolean,
) => {
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const lastProcessTimeRef = useRef<number>(0);
  const consecutiveErrorsRef = useRef<number>(0);

  useEffect(() => {
    if (!active) {
      samMaskCache.clear();
      return;
    }

    // Clear any leftover stale masks on start
    samMaskCache.clear();

    // 1. Allocate persistent offscreen canvas
    const os = document.createElement('canvas');
    os.width = 1024;
    os.height = 1024;
    offscreenRef.current = os;
    ctxRef.current = os.getContext('2d', { willReadFrequently: true });

    // 2. Worker logic removed; we use Backend Proxy instead

    // 5. Transient subscription (prevents destructive main-thread re-renders)
    const unsubscribe = useAiScanStore.subscribe((state) => {
      const now = performance.now();
      if (now - lastProcessTimeRef.current < PROCESS_INTERVAL_MS) return;

      const boxesNeedingMask = state.detections.filter(
        (d) => (d.status === 'RAW' || d.status === 'PENDING') && !samMaskCache.hasMask(d.id)
      );
      if (boxesNeedingMask.length === 0) return;

      const video = videoRef.current;
      const ctx = ctxRef.current;
      const osCanvas = offscreenRef.current;

      if (!video || !ctx || !osCanvas || video.readyState < 2 || video.videoWidth === 0) {
        return;
      }

      // Throttled frame capture
      lastProcessTimeRef.current = now;

      // Draw letterboxed video onto 1024x1024 offscreen canvas
      const w = video.videoWidth;
      const h = video.videoHeight;
      const scaleSam = Math.min(1024 / w, 1024 / h);
      const dwSam = w * scaleSam;
      const dhSam = h * scaleSam;
      const dxSam = (1024 - dwSam) / 2;
      const dySam = (1024 - dhSam) / 2;

      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, 1024, 1024);
      ctx.drawImage(video, 0, 0, w, h, dxSam, dySam, dwSam, dhSam);

      try {
        osCanvas.toBlob(async (blob) => {
          if (!blob) return;

          // Update Zustand flags to pending for these boxes
          boxesNeedingMask.forEach((box) => {
            useAiScanStore.getState().setSegmentationStatus(box.id, 'pending');
          });

          // Call API for each box
          for (const box of boxesNeedingMask) {
            // Map box center from video coords to 1024x1024 padded canvas coords
            const centerX = box.x + box.width / 2;
            const centerY = box.y + box.height / 2;
            const coordX = Math.round(centerX * scaleSam + dxSam);
            const coordY = Math.round(centerY * scaleSam + dySam);

            try {
              const maskBase64 = await segmentWithAI(blob, coordX, coordY);
              
              if (maskBase64) {
                const rawBase64 = maskBase64.replace(/^data:image\/.*;base64,/, "");
                const binaryString = atob(rawBase64);
                const len = binaryString.length;
                const maskData = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                    maskData[i] = binaryString.charCodeAt(i);
                }
                
                samMaskCache.setMask(box.id, {
                  detectionId: box.id,
                  maskData,
                  maskWidth: 1024,
                  maskHeight: 1024
                });
                useAiScanStore.getState().setSegmentationStatus(box.id, 'ready');
                consecutiveErrorsRef.current = 0; // Reset errors on success
              } else {
                useAiScanStore.getState().setSegmentationStatus(box.id, 'error');
                consecutiveErrorsRef.current += 1;
              }
            } catch (err) {
              console.error(`Error procesando máscara para la caja ${box.id}`, err);
              useAiScanStore.getState().setSegmentationStatus(box.id, 'error');
              consecutiveErrorsRef.current += 1;
            }
            
            if (consecutiveErrorsRef.current >= 3) {
              useAiScanStore.getState().setSamGlobalError(true);
            }
          }
        }, 'image/jpeg', 0.8);

      } catch (err) {
        console.error('[SAM Hook] Failed to extract image data or call API:', err);
      }
    });

    return () => {
      unsubscribe();
      samMaskCache.clear();
    };
  }, [active, videoRef]);
};
