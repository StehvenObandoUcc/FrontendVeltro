/**
 * useYoloDetection — Split Producer
 *
 * Performance contract:
 *  - LOOP A (Inference): runs every 250 ms via timestamp check inside a rAF.
 *    Produces: store.detections (via setRawDetections) and store.trackedBoxes.
 *  - LOOP B (Render): native 60 FPS rAF owned by DetectionOverlay.tsx.
 *    This hook no longer touches the canvas.
 *  - Inference runs on a reusable 640×640 offscreen canvas (no GC pressure).
 *  - Main thread yields after every inference via setTimeout(0).
 *
 * TWO-LAYER IoU:
 *  - store.setRawDetections IoU  → preserves YoloBox.id for useAiScanQueue
 *  - Internal IOU tracker below  → assigns visual trackId for DetectionOverlay
 */

import { useEffect, useRef, useState } from 'react';
import * as ort from 'onnxruntime-web';
import { useAiScanStore } from '../stores/aiScanStore';
import type { TrackedBox } from '../stores/aiScanStore';
import type { YoloBox } from '../modules/types/ai.types';

// ── Tuning constants ───────────────────────────────────────────────────────────
const MODEL_PATH         = '/model/yolov8n.onnx';
const INFER_INTERVAL_MS  = 250;   // ~4 FPS inference cadence
const STORE_DISPATCH_MS  = 800;   // setRawDetections throttle (useAiScanQueue)
const TRACK_IOU_THRESH   = 0.30;  // IOU threshold for visual tracker
const TRACK_STALE_MS     = 500;   // Remove track after 500 ms of no match
const CONF_THRESH        = 0.25;
const IOU_THRESH         = 0.45;  // NMS threshold
const MAX_DETS           = 20;
const BOX_PADDING        = 12;
const INPUT_SIZE         = 640;   // Fixed — yolov8n.onnx has static 640×640 input

// COCO class names (index = class id)
const COCO_NAMES = [
  'person','bicycle','car','motorcycle','airplane','bus','train','truck','boat',
  'traffic light','fire hydrant','stop sign','parking meter','bench','bird','cat',
  'dog','horse','sheep','cow','elephant','bear','zebra','giraffe','backpack',
  'umbrella','handbag','tie','suitcase','frisbee','skis','snowboard','sports ball',
  'kite','baseball bat','baseball glove','skateboard','surfboard','tennis racket',
  'bottle','wine glass','cup','fork','knife','spoon','bowl','banana','apple',
  'sandwich','orange','broccoli','carrot','hot dog','pizza','donut','cake',
  'chair','couch','potted plant','bed','dining table','toilet','tv','laptop',
  'mouse','remote','keyboard','cell phone','microwave','oven','toaster','sink',
  'refrigerator','book','clock','vase','scissors','teddy bear','hair drier','toothbrush',
];

// Classes that are NOT products — skip them to avoid false detections
const IGNORED_CLASSES = new Set([
  0, 1, 2, 3, 4, 5, 6, 7, 8, 13, 56, 57, 59, 60, 61, 62, 70, 71, 72,
]);

// ── Internal IOU helper ────────────────────────────────────────────────────────
function computeIou(a: YoloBox, b: YoloBox): number {
  const ix = Math.max(a.x, b.x);
  const iy = Math.max(a.y, b.y);
  const iw = Math.max(0, Math.min(a.x + a.width,  b.x + b.width)  - ix);
  const ih = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - iy);
  if (iw <= 0 || ih <= 0) return 0;
  const inter = iw * ih;
  const union = a.width * a.height + b.width * b.height - inter;
  return inter / union;
}

// ── Hook ───────────────────────────────────────────────────────────────────────
export const useYoloDetection = (
  videoRef:  React.RefObject<HTMLVideoElement>,
  canvasRef: React.RefObject<HTMLCanvasElement>,
  active: boolean,
) => {
  const setRawDetections  = useAiScanStore((s) => s.setRawDetections);
  const setTrackedBoxes   = useAiScanStore((s) => s.setTrackedBoxes);

  const sessionRef      = useRef<ort.InferenceSession | null>(null);
  const rafRef          = useRef<number | undefined>(undefined);
  const isRunning       = useRef(false);
  const lastInferAt     = useRef(0);
  const lastDispatchAt  = useRef(0);

  // Persistent 640×640 offscreen canvas — allocated once, reused every frame
  const offscreenRef    = useRef<HTMLCanvasElement | null>(null);
  const offscreenCtxRef = useRef<CanvasRenderingContext2D | null>(null);

  // Internal visual tracker state (NOT in Zustand — updated per inference frame)
  const tracksRef = useRef<TrackedBox[]>([]);

  const [modelLoaded, setModelLoaded] = useState(false);
  const [modelError,  setModelError]  = useState<string | null>(null);

  // ── 1. Load ONNX model ─────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        ort.env.wasm.numThreads = 1;

        const session = await ort.InferenceSession.create(MODEL_PATH, {
          executionProviders: ['webgl', 'wasm'],
        });

        if (cancelled) return;
        sessionRef.current = session;
        setModelLoaded(true);
        console.log('[YOLO] Loaded. Inputs:', session.inputNames, '| Outputs:', session.outputNames);
      } catch (err) {
        console.error('[YOLO] Model load failed:', err);
        setModelError(String(err));
      }
    };

    // Allocate persistent offscreen canvas
    const os = document.createElement('canvas');
    os.width  = INPUT_SIZE;
    os.height = INPUT_SIZE;
    offscreenRef.current    = os;
    offscreenCtxRef.current = os.getContext('2d', { willReadFrequently: true })!;

    load();
    return () => { cancelled = true; };
  }, []);

  // ── 2. LOOP A — Inference loop (~4 FPS via timestamp gate) ────────────────
  useEffect(() => {
    if (!active || !modelLoaded) {
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
      // Clear canvas dimensions tracking when deactivated
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
      // Clear tracked boxes in store
      setTrackedBoxes([]);
      tracksRef.current = [];
      return;
    }

    const loop = async () => {
      const now     = performance.now();
      const video   = videoRef.current;
      const canvas  = canvasRef.current;
      const osCtx   = offscreenCtxRef.current;
      const session = sessionRef.current;

      // Sync canvas resolution to video dimensions
      if (canvas && video && video.videoWidth > 0) {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width  = video.videoWidth;
          canvas.height = video.videoHeight;
        }
      }

      const canRun = (
        session && video && osCtx &&
        video.readyState >= 2 &&
        video.videoWidth > 0 &&
        !isRunning.current &&
        (now - lastInferAt.current) >= INFER_INTERVAL_MS
      );

      if (canRun) {
        isRunning.current   = true;
        lastInferAt.current = now;

        try {
          // ── A. Letterbox scale to strict 640×640 ──────────────────────
          const scale = Math.min(INPUT_SIZE / video.videoWidth, INPUT_SIZE / video.videoHeight);
          const dw    = Math.round(video.videoWidth  * scale);
          const dh    = Math.round(video.videoHeight * scale);
          const dx    = Math.round((INPUT_SIZE - dw) / 2);
          const dy    = Math.round((INPUT_SIZE - dh) / 2);

          osCtx.fillStyle = '#000';
          osCtx.fillRect(0, 0, INPUT_SIZE, INPUT_SIZE);
          osCtx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight, dx, dy, dw, dh);

          const pixels = osCtx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE).data;

          // ── B. Build Float32 tensor [1, 3, 640, 640] ─────────────────
          const floatData = new Float32Array(3 * INPUT_SIZE * INPUT_SIZE);
          const px        = INPUT_SIZE * INPUT_SIZE;
          for (let i = 0; i < px; i++) {
            floatData[i]          = pixels[i * 4]     / 255;
            floatData[i +     px] = pixels[i * 4 + 1] / 255;
            floatData[i + 2 * px] = pixels[i * 4 + 2] / 255;
          }

          // ── C. Run ONNX inference ─────────────────────────────────────
          const inputName  = session!.inputNames[0];
          const outputName = session!.outputNames[0];
          const feed    = { [inputName]: new ort.Tensor('float32', floatData, [1, 3, INPUT_SIZE, INPUT_SIZE]) };
          const results = await session!.run(feed);
          const out     = results[outputName];

          if (!out) throw new Error(`Output "${outputName}" missing`);

          // ── D. Parse output (auto-detect channel-first vs box-first) ──
          const dim1       = out.dims[1];
          const dim2       = out.dims[2];
          const isBoxFirst = dim2 <= 84 && dim1 > dim2;
          const numBoxes   = isBoxFirst ? dim1 : dim2;
          const numAttribs = isBoxFirst ? dim2 : dim1;
          const numClasses = numAttribs - 4;
          const data       = out.data as Float32Array;

          const raw: YoloBox[] = [];

          for (let i = 0; i < numBoxes; i++) {
            let maxConf  = 0;
            let maxClass = -1;
            for (let c = 0; c < numClasses; c++) {
              const prob = isBoxFirst
                ? data[i * numAttribs + 4 + c]
                : data[(4 + c) * numBoxes + i];
              if (prob > maxConf) { maxConf = prob; maxClass = c; }
            }

            if (maxConf < CONF_THRESH || IGNORED_CLASSES.has(maxClass)) continue;

            const cx = isBoxFirst ? data[i * numAttribs]     : data[0 * numBoxes + i];
            const cy = isBoxFirst ? data[i * numAttribs + 1] : data[1 * numBoxes + i];
            const bw = isBoxFirst ? data[i * numAttribs + 2] : data[2 * numBoxes + i];
            const bh = isBoxFirst ? data[i * numAttribs + 3] : data[3 * numBoxes + i];

            const cocoName = COCO_NAMES[maxClass] ?? `cls${maxClass}`;
            raw.push({
              id:         crypto.randomUUID(),
              x:          Math.max(0, (cx - bw / 2 - dx) / scale - BOX_PADDING),
              y:          Math.max(0, (cy - bh / 2 - dy) / scale - BOX_PADDING),
              width:      bw / scale + BOX_PADDING * 2,
              height:     bh / scale + BOX_PADDING * 2,
              confidence: maxConf,
              className:  cocoName,
              status:     'RAW',
              matches:    [],
            });
          }

          // ── E. NMS ────────────────────────────────────────────────────
          raw.sort((a, b) => b.confidence - a.confidence);
          const kept: YoloBox[] = [];
          outer: for (const box of raw) {
            for (const sel of kept) {
              if (computeIou(box, sel) > IOU_THRESH) continue outer;
            }
            kept.push(box);
            if (kept.length >= MAX_DETS) break;
          }

          // ── F. Dispatch to Zustand at low frequency (for API queue) ───
          if (performance.now() - lastDispatchAt.current >= STORE_DISPATCH_MS) {
            lastDispatchAt.current = performance.now();
            setRawDetections(kept);
          }

          // ── G. Visual IOU tracker — assigns stable trackId ─────────────
          // This is SEPARATE from setRawDetections IoU — different IDs, different purpose.
          const nowTrack    = performance.now();
          const prevTracks  = tracksRef.current;
          const matchedPrev = new Set<string>(); // trackIds already matched
          const nextTracks: TrackedBox[] = [];

          for (const box of kept) {
            let bestTrack: TrackedBox | null = null;
            let bestIou   = 0;

            for (const track of prevTracks) {
              if (matchedPrev.has(track.trackId)) continue;
              const iou = computeIou(box, track.box);
              if (iou > TRACK_IOU_THRESH && iou > bestIou) {
                bestIou   = iou;
                bestTrack = track;
              }
            }

            if (bestTrack !== null) {
              matchedPrev.add(bestTrack.trackId);
              nextTracks.push({
                trackId:  bestTrack.trackId,
                box,
                lastSeen: nowTrack,
              });
            } else {
              // New object — assign a fresh trackId
              nextTracks.push({
                trackId:  crypto.randomUUID(),
                box,
                lastSeen: nowTrack,
              });
            }
          }

          // Carry forward stale tracks (not yet expired) for last-known-position draw
          for (const track of prevTracks) {
            if (matchedPrev.has(track.trackId)) continue;
            if (nowTrack - track.lastSeen < TRACK_STALE_MS) {
              nextTracks.push(track); // keep at last known position
            }
            // Expired tracks are simply dropped
          }

          tracksRef.current = nextTracks;

          // Update store only when the set of tracked IDs changes
          const prevIds = new Set(prevTracks.map((t) => t.trackId));
          const nextIds = new Set(nextTracks.map((t) => t.trackId));
          const idsChanged =
            nextIds.size !== prevIds.size ||
            [...nextIds].some((id) => !prevIds.has(id));

          if (idsChanged) {
            setTrackedBoxes(nextTracks);
          }

        } catch (err) {
          console.error('[YOLO] Inference error:', err);
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
