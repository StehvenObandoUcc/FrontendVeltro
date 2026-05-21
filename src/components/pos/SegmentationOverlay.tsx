import React, { useEffect, useRef } from 'react';
import { useAiScanStore } from '../../stores/aiScanStore';
import { samMaskCache } from '../../workers/samMaskCache';

interface Props {
  videoRef: React.RefObject<HTMLVideoElement>;
}

// Emerald color (rgba(16, 185, 129, 0.35)) in little-endian ABGR 32-bit representation:
// Alpha = 0.35 * 255 = 89 (0x59)
// Blue = 129 (0x81)
// Green = 185 (0xB9)
// Red = 16 (0x10)
const EMERALD_ABGR = 0x5981B910;

export const SegmentationOverlay: React.FC<Props> = ({ videoRef }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>();

  // Persistent offscreen canvas for fast hardware-accelerated scaling
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const imageDataRef = useRef<ImageData | null>(null);

  useEffect(() => {
    // 1. Allocate offscreen canvas
    const os = document.createElement('canvas');
    os.width = 1024;
    os.height = 1024;
    offscreenCanvasRef.current = os;
    offscreenCtxRef.current = os.getContext('2d', { willReadFrequently: true });
    imageDataRef.current = offscreenCtxRef.current?.createImageData(1024, 1024) || null;

    // 2. Main 60 FPS render loop
    const render = () => {
      const displayCanvas = canvasRef.current;
      const video = videoRef.current;
      const osCanvas = offscreenCanvasRef.current;
      const osCtx = offscreenCtxRef.current;
      const imgData = imageDataRef.current;

      if (!displayCanvas || !video || !osCanvas || !osCtx || !imgData || video.readyState < 2 || video.videoWidth === 0) {
        rafRef.current = requestAnimationFrame(render);
        return;
      }

      // Sync display canvas size to video dimensions
      if (displayCanvas.width !== video.videoWidth || displayCanvas.height !== video.videoHeight) {
        displayCanvas.width = video.videoWidth;
        displayCanvas.height = video.videoHeight;
      }

      const displayCtx = displayCanvas.getContext('2d');
      if (!displayCtx) {
        rafRef.current = requestAnimationFrame(render);
        return;
      }

      // Collect IDs with masks ready — from YOLO detections AND SAM tap entries
      const state = useAiScanStore.getState();

      const readyMaskIds: string[] = [];

      // YOLO detections with segmentation ready
      for (const d of state.detections) {
        if (state.segmentationStatus[d.id] === 'ready') {
          readyMaskIds.push(d.id);
        }
      }

      // SAM tap entries with segmentation ready
      for (const e of state.samTapEntries) {
        if (state.segmentationStatus[e.id] === 'ready') {
          readyMaskIds.push(e.id);
        }
      }

      displayCtx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);

      if (readyMaskIds.length > 0) {
        // Clear offscreen canvas
        osCtx.clearRect(0, 0, 1024, 1024);

        // Blit active masks to 32-bit pixel array
        const pixelBuf = new ArrayBuffer(1024 * 1024 * 4);
        const u32View = new Uint32Array(pixelBuf);

        let hasAnyMasks = false;
        for (const id of readyMaskIds) {
          const mask = samMaskCache.getMask(id);
          if (!mask) continue;
          hasAnyMasks = true;

          for (let i = 0; i < 1024 * 1024; i++) {
            if (mask.maskData[i] === 1) {
              u32View[i] = EMERALD_ABGR;
            }
          }
        }

        if (hasAnyMasks) {
          // Copy to offscreen ImageData and draw
          imgData.data.set(new Uint8ClampedArray(pixelBuf));
          osCtx.putImageData(imgData, 0, 0);

          // Map letterbox scaling
          const w = video.videoWidth;
          const h = video.videoHeight;
          const scaleSam = Math.min(1024 / w, 1024 / h);
          const dw = w * scaleSam;
          const dh = h * scaleSam;
          const dx = (1024 - dw) / 2;
          const dy = (1024 - dh) / 2;

          // Draw the letterboxed portion of the mask canvas onto full display canvas
          displayCtx.drawImage(
            osCanvas,
            dx, dy, dw, dh, // source sub-rectangle
            0, 0, w, h     // destination rectangle
          );
        }
      }

      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [videoRef]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full object-cover pointer-events-none"
    />
  );
};
