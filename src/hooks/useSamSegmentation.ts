import { useEffect, useRef } from 'react';
import { useAiScanStore } from '../stores/aiScanStore';
import { samMaskCache } from '../workers/samMaskCache';

const PROCESS_INTERVAL_MS = 3000; // 3 seconds throttle for SAM 2 encoder execution

export const useSamSegmentation = (
  videoRef: React.RefObject<HTMLVideoElement>,
  active: boolean,
) => {
  const workerRef = useRef<Worker>();
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const lastProcessTimeRef = useRef<number>(0);

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

    // 2. Initialize worker
    workerRef.current = new Worker(new URL('../workers/sam.worker.ts', import.meta.url), { type: 'module' });

    // 3. Receive masks from worker and save to vanilla memory cache
    workerRef.current.onmessage = (e) => {
      if (e.data.type === 'MASK_READY') {
        samMaskCache.setMask(e.data.boxId, e.data.mask);
        useAiScanStore.getState().setSegmentationStatus(e.data.boxId, 'ready');
      } else if (e.data.type === 'ERROR' || e.data.type === 'CRITICAL_ERROR') {
        console.error('[SAM Worker] Error received:', e.data.error);
        useAiScanStore.getState().setSamGlobalError(true);
      }
    };

    // 4. Catch worker crashes
    workerRef.current.onerror = (err) => {
      console.error('[SAM Worker] Critical Web Worker error:', err);
      useAiScanStore.getState().setSamGlobalError(true);
    };

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
        const imgData = ctx.getImageData(0, 0, 1024, 1024);
        const pixels = imgData.data; // Uint8ClampedArray

        // Update Zustand flags to pending for these boxes
        boxesNeedingMask.forEach((box) => {
          useAiScanStore.getState().setSegmentationStatus(box.id, 'pending');
        });

        // Send to worker transferring the array buffer
        workerRef.current?.postMessage(
          {
            type: 'PROCESS_BOXES',
            pixels,
            boxes: boxesNeedingMask,
            videoWidth: w,
            videoHeight: h,
          },
          [pixels.buffer]
        );
      } catch (err) {
        console.error('[SAM Hook] Failed to extract image data or post message:', err);
      }
    });

    return () => {
      unsubscribe();
      workerRef.current?.terminate();
      samMaskCache.clear();
    };
  }, [active, videoRef]);
};
