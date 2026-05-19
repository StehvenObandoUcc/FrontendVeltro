/**
 * useYoloDetection — Web Worker Orchestrator
 *
 * Performance contract:
 *  - Main thread no longer blocked by ONNX inference.
 *  - LOOP A (Inference Trigger): runs every ~250 ms via timestamp check inside a rAF.
 *    Extracts pixels from an offscreen canvas and sends to Web Worker.
 *  - Backpressure: If the worker is busy processing a frame, subsequent frames are dropped.
 *  - Worker returns detections and visual tracks via postMessage.
 *  - LOOP B (Render): native 60 FPS rAF owned by DetectionOverlay.tsx.
 */

import { useEffect, useRef, useState } from 'react';
import { useAiScanStore } from '../stores/aiScanStore';
import type { TrackedBox, YoloBox, YoloWorkerRequest, YoloWorkerResponse } from '../modules/types/ai.types';

// ── Tuning constants ───────────────────────────────────────────────────────────
const INFER_INTERVAL_MS  = 250;   // ~4 FPS inference cadence
const STORE_DISPATCH_MS  = 800;   // setRawDetections throttle (useAiScanQueue)
const INPUT_SIZE         = 640;   // Fixed — yolo11s.onnx has static 640×640 input

export const useYoloDetection = (
  videoRef:  React.RefObject<HTMLVideoElement>,
  canvasRef: React.RefObject<HTMLCanvasElement>,
  active: boolean,
) => {
  const setRawDetections  = useAiScanStore((s) => s.setRawDetections);
  const setTrackedBoxes   = useAiScanStore((s) => s.setTrackedBoxes);

  const workerRef         = useRef<Worker | null>(null);
  const rafRef            = useRef<number | undefined>(undefined);
  
  // Backpressure & timing
  const isWorkerBusy      = useRef(false);
  const isRunning         = useRef(false);
  const lastInferAt       = useRef(0);
  const lastDispatchAt    = useRef(0);

  // Persistent offscreen canvas
  const offscreenRef      = useRef<HTMLCanvasElement | null>(null);
  const offscreenCtxRef   = useRef<CanvasRenderingContext2D | null>(null);

  // Zustand state diffing
  const currentTrackIds   = useRef<Set<string>>(new Set());

  const [modelLoaded, setModelLoaded] = useState(false);
  const [modelError,  setModelError]  = useState<string | null>(null);

  // ── 1. Initialize Worker ───────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const worker = new Worker(new URL('../workers/yolo.worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent<YoloWorkerResponse>) => {
      if (cancelled) return;
      const res = e.data;

      if (res.type === 'INIT_SUCCESS') {
        setModelLoaded(true);
      } else if (res.type === 'INIT_ERROR' || res.type === 'ERROR') {
        console.error('[YOLO Hook] Worker error:', res.error);
        setModelError(res.error || 'Unknown error');
        isWorkerBusy.current = false;
      } else if (res.type === 'DETECT_SUCCESS') {
        isWorkerBusy.current = false; // Free up the worker
        
        // Dispatch Raw Detections (Throttled)
        if (performance.now() - lastDispatchAt.current >= STORE_DISPATCH_MS) {
          lastDispatchAt.current = performance.now();
          setRawDetections(res.detections || []);
        }

        // Dispatch Tracked Boxes (Only on ID change)
        const nextTracks = res.trackedBoxes || [];
        const nextIds = new Set(nextTracks.map(t => t.trackId));
        
        const idsChanged = nextIds.size !== currentTrackIds.current.size ||
                           [...nextIds].some(id => !currentTrackIds.current.has(id));

        if (idsChanged) {
          currentTrackIds.current = nextIds;
          setTrackedBoxes(nextTracks);
        }
      }
    };

    worker.postMessage({ type: 'INIT' } as YoloWorkerRequest);

    // Allocate persistent offscreen canvas
    const os = document.createElement('canvas');
    os.width  = INPUT_SIZE;
    os.height = INPUT_SIZE;
    offscreenRef.current    = os;
    offscreenCtxRef.current = os.getContext('2d', { willReadFrequently: true })!;

    return () => {
      cancelled = true;
      worker.terminate();
    };
  }, []);

  // ── 2. LOOP A — Inference loop (~4 FPS via timestamp gate) ────────────────
  useEffect(() => {
    if (!active || !modelLoaded) {
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
      setTrackedBoxes([]);
      currentTrackIds.current = new Set();
      return;
    }

    const loop = async () => {
      const now     = performance.now();
      const video   = videoRef.current;
      const canvas  = canvasRef.current;
      const osCtx   = offscreenCtxRef.current;
      const worker  = workerRef.current;

      // Sync canvas resolution to video dimensions
      if (canvas && video && video.videoWidth > 0) {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width  = video.videoWidth;
          canvas.height = video.videoHeight;
        }
      }

      // Check if we can dispatch a new frame
      const canRun = (
        worker && video && osCtx &&
        video.readyState >= 2 &&
        video.videoWidth > 0 &&
        !isRunning.current &&
        !isWorkerBusy.current && // Backpressure check
        (now - lastInferAt.current) >= INFER_INTERVAL_MS
      );

      if (canRun) {
        isRunning.current   = true;
        isWorkerBusy.current = true; // Lock until worker replies
        lastInferAt.current = now;

        try {
          // A. Scale to 640x640 offscreen
          const scale = Math.min(INPUT_SIZE / video.videoWidth, INPUT_SIZE / video.videoHeight);
          const dw    = Math.round(video.videoWidth  * scale);
          const dh    = Math.round(video.videoHeight * scale);
          const dx    = Math.round((INPUT_SIZE - dw) / 2);
          const dy    = Math.round((INPUT_SIZE - dh) / 2);

          osCtx.fillStyle = '#000';
          osCtx.fillRect(0, 0, INPUT_SIZE, INPUT_SIZE);
          osCtx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight, dx, dy, dw, dh);

          // B. Extract ImageData and transfer its buffer to the worker
          const imageData = osCtx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE);
          const buffer = imageData.data.buffer;

          worker.postMessage({
            type: 'DETECT',
            buffer: buffer,
            width: video.videoWidth,
            height: video.videoHeight
          } as YoloWorkerRequest, [buffer]); // ZERO-COPY Transferable

        } catch (err) {
          console.error('[YOLO Hook] Dispatch error:', err);
          isWorkerBusy.current = false; // Unlock on error
        } finally {
          isRunning.current = false;
        }
      }

      // Yield to main thread before scheduling next frame
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    
    return () => {
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
    };
  }, [active, modelLoaded, canvasRef, videoRef, setRawDetections, setTrackedBoxes]);

  return { modelLoaded, modelError };
};
