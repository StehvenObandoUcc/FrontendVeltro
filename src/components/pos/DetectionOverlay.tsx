/**
 * DetectionOverlay — LOOP B (Consumer, native 60 FPS render)
 *
 * Owns its own rAF loop. Reads store.trackedBoxes — written by the
 * IOU tracker inside useYoloDetection — and paints bounding boxes each frame.
 *
 * Completely decoupled from inference cadence (~4 FPS): the canvas is
 * re-drawn at native 60 FPS but boxes only move when inference produces a
 * new position (last-known-position draw, no velocity extrapolation).
 */

import React, { useEffect, useRef } from 'react';
import { useAiScanStore } from '../../stores/aiScanStore';

// Colour palette per lifecycle status (mirrors useYoloDetection original)
const STATUS_COLOR: Record<string, string> = {
  RAW:     '#F59E0B',
  PENDING: '#3B82F6',
  SUCCESS: '#10B981',
  ADDED:   '#059669',
  ERROR:   '#EF4444',
};

interface DetectionOverlayProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

export const DetectionOverlay: React.FC<DetectionOverlayProps> = ({ canvasRef }) => {
  const trackedBoxes  = useAiScanStore((s) => s.trackedBoxes);
  const rafRef        = useRef<number | undefined>(undefined);

  // Keep a ref to the latest trackedBoxes to avoid stale closure inside rAF
  const trackedRef = useRef(trackedBoxes);
  useEffect(() => {
    trackedRef.current = trackedBoxes;
  }, [trackedBoxes]);

  useEffect(() => {
    const renderFrame = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        rafRef.current = requestAnimationFrame(renderFrame);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        rafRef.current = requestAnimationFrame(renderFrame);
        return;
      }

      const boxes = trackedRef.current;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const tracked of boxes) {
        const { box } = tracked;

        // Look up the matching stored detection for its lifecycle status
        const stored = useAiScanStore.getState().detections.find((d) =>
          Math.abs(d.x - box.x) < 30 && Math.abs(d.y - box.y) < 30
        );
        const status = stored?.status ?? box.status ?? 'RAW';
        const color  = STATUS_COLOR[status] ?? STATUS_COLOR.RAW;
        const label  = status === 'PENDING'
          ? 'Escaneando…'
          : (stored?.matches?.[0]?.name ?? `${box.className} ${(box.confidence * 100).toFixed(0)}%`);

        // Draw bounding rect
        ctx.strokeStyle = color;
        ctx.lineWidth   = 2.5;
        ctx.strokeRect(box.x, box.y, box.width, box.height);

        // Check if SAM 2 segmentation is active and draw inner border
        const segStatus = useAiScanStore.getState().segmentationStatus[stored?.id ?? box.id];
        if (segStatus === 'ready') {
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth   = 1;
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(box.x + 3, box.y + 3, box.width - 6, box.height - 6);
          ctx.setLineDash([]);
        }

        // Draw label background + text
        ctx.font = 'bold 13px Inter, system-ui, sans-serif';
        const tw = ctx.measureText(label).width;
        const ph = 20;
        const ly = box.y > ph ? box.y - ph : box.y + box.height;

        ctx.fillStyle = color;
        ctx.beginPath();
        if (typeof (ctx as CanvasRenderingContext2D & { roundRect?: (...args: number[]) => void }).roundRect === 'function') {
          (ctx as CanvasRenderingContext2D & { roundRect?: (...args: number[]) => void }).roundRect!(box.x, ly, tw + 12, ph, 4);
        } else {
          ctx.rect(box.x, ly, tw + 12, ph);
        }
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.fillText(label, box.x + 6, ly + ph - 5);
      }

      rafRef.current = requestAnimationFrame(renderFrame);
    };

    rafRef.current = requestAnimationFrame(renderFrame);
    return () => {
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
    };
  // canvasRef is a stable ref object — intentionally omitted from deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // This component renders nothing into the DOM — it only paints on the canvas
  return null;
};
