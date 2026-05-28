import * as ort from 'onnxruntime-web';
import type { TrackedBox, YoloBox, YoloWorkerRequest, YoloWorkerResponse } from '../modules/types/ai.types';
import { loadModelWithCache } from '../utils/modelCache';

// ── Tuning constants ───────────────────────────────────────────────────────────
const MODEL_PATH         = '/model/yolov11.onnx';
const TRACK_IOU_THRESH   = 0.30;  // IOU threshold for visual tracker
const TRACK_STALE_MS     = 500;   // Remove track after 500 ms of no match
const CONF_THRESH        = 0.50;
const IOU_THRESH         = 0.45;  // NMS threshold
const MAX_DETS           = 20;
const BOX_PADDING        = 12;
const INPUT_SIZE         = 640;   // Fixed — yolo11s.onnx has static 640×640 input
// EMA smoothing factor for tracked bounding box coordinates.
// Applied ONLY when a new detection matches an existing track (i.e. there is a
// previous position to interpolate against). New detections with no prior
// history receive the raw YOLO coordinates unchanged.
// Range: 0 < EMA_ALPHA < 1. Higher = faster response, more jitter.
//        Lower = smoother, but adds visual lag on fast-moving objects.
// 0.6 is a conservative starting point for a near-static POS scenario.
const EMA_ALPHA          = 0.6;

// Full COCO 80-class names (index = class id)
const YOLO_CLASSES = [
  'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat',
  'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat',
  'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack',
  'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard', 'sports ball',
  'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket',
  'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
  'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake',
  'chair', 'couch', 'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop',
  'mouse', 'remote', 'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink',
  'refrigerator', 'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush',
];

// Only detect these COCO class IDs — all others are silently ignored
const ALLOWED_CLASS_IDS = new Set([
  39,  // bottle
  41,  // cup
  73,  // book
  67,  // cell phone
  65,  // remote
  24,  // backpack
  26,  // handbag
  28,  // suitcase
  29,  // teddy bear
  30,  // sports ball 
  31,  // scissors   
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

// ── Worker State ───────────────────────────────────────────────────────────────
let session: ort.InferenceSession | null = null;
let tracks: TrackedBox[] = [];

self.onmessage = async (e: MessageEvent<YoloWorkerRequest>) => {
  const req = e.data;

  try {
    if (req.type === 'INIT') {
      ort.env.wasm.numThreads = 1;
      // executionProviders order: onnxruntime-web tries each entry left-to-right
      // and silently falls back to the next one if the current provider cannot
      // be initialized by the browser (e.g. no WebGPU support, old GPU driver).
      // 'webgpu' → 'webgl' → 'wasm' ensures best available hardware acceleration.
      // ── Load model via IndexedDB cache ──────────────────────────────────
      // loadModelWithCache returns an ArrayBuffer on hit (no network) or after
      // the first download + store. Falls back to the URL string if IndexedDB
      // is unavailable (Safari private mode, etc.), so ONNX creates the session
      // via fetch as before. Both signatures are valid in onnxruntime-web 1.25.1.
      const modelSource = await loadModelWithCache(MODEL_PATH);
      session = await ort.InferenceSession.create(modelSource as ArrayBuffer, {
        executionProviders: ['webgpu', 'webgl', 'wasm'],
      });
      // ── Warmup: amortize JIT compilation cost on first real frame ────────────
      // A forward pass with a zero tensor warms WebGL/WASM JIT caches so the
      // first real detection does not pay the compilation penalty.
      try {
        const warmupData = new Float32Array(3 * INPUT_SIZE * INPUT_SIZE);
        const warmupTensor = new ort.Tensor('float32', warmupData, [1, 3, INPUT_SIZE, INPUT_SIZE]);
        const warmupFeed = { [session.inputNames[0]]: warmupTensor };
        await session.run(warmupFeed);
        console.log('[YOLO Worker] Warmup inference complete');
      } catch (warmupErr) {
        console.warn('[YOLO Worker] Warmup inference failed (non-fatal):', warmupErr);
      }
      if (import.meta.env.DEV) {
        console.log('[YOLO Worker] Session created. Requested providers: webgpu, webgl, wasm');
        console.log(`[YOLO Worker] Warmup tensor: ${3 * INPUT_SIZE * INPUT_SIZE * 4} bytes`);
      }
      self.postMessage({ type: 'INIT_SUCCESS' } as YoloWorkerResponse);
      return;
    }

    if (req.type === 'DETECT') {
      if (!session) throw new Error('ONNX Session not initialized');
      if (!req.buffer || !req.width || !req.height) throw new Error('Missing frame data');

      const videoWidth = req.width;
      const videoHeight = req.height;
      const pixels = new Uint8ClampedArray(req.buffer);

      // Scale calculations exactly as before
      const scale = Math.min(INPUT_SIZE / videoWidth, INPUT_SIZE / videoHeight);
      const dw    = Math.round(videoWidth  * scale);
      const dh    = Math.round(videoHeight * scale);
      const dx    = Math.round((INPUT_SIZE - dw) / 2);
      const dy    = Math.round((INPUT_SIZE - dh) / 2);

      // ── B. Build Float32 tensor [1, 3, 640, 640] ─────────────────
      const floatData = new Float32Array(3 * INPUT_SIZE * INPUT_SIZE);
      const px        = INPUT_SIZE * INPUT_SIZE;
      for (let i = 0; i < px; i++) {
        floatData[i]          = pixels[i * 4]     / 255;
        floatData[i +     px] = pixels[i * 4 + 1] / 255;
        floatData[i + 2 * px] = pixels[i * 4 + 2] / 255;
      }

      // ── C. Run ONNX inference ──────────────────────────────────────────
      const inputName  = session.inputNames[0];
      const outputName = session.outputNames[0];
      const feed    = { [inputName]: new ort.Tensor('float32', floatData, [1, 3, INPUT_SIZE, INPUT_SIZE]) };
      const t0 = performance.now();
      const results = await session.run(feed);
      const inferMs = performance.now() - t0;
      if (import.meta.env.DEV) {
        console.log(`[YOLO Worker] Inference: ${inferMs.toFixed(1)} ms`);
      }
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

        if (maxConf < CONF_THRESH) continue;

        if (!ALLOWED_CLASS_IDS.has(maxClass)) continue;

        const cx = isBoxFirst ? data[i * numAttribs]     : data[0 * numBoxes + i];
        const cy = isBoxFirst ? data[i * numAttribs + 1] : data[1 * numBoxes + i];
        const bw = isBoxFirst ? data[i * numAttribs + 2] : data[2 * numBoxes + i];
        const bh = isBoxFirst ? data[i * numAttribs + 3] : data[3 * numBoxes + i];

        const className = YOLO_CLASSES[maxClass] ?? `cls${maxClass}`;
        raw.push({
          id:         crypto.randomUUID(),
          x:          Math.max(0, (cx - bw / 2 - dx) / scale - BOX_PADDING),
          y:          Math.max(0, (cy - bh / 2 - dy) / scale - BOX_PADDING),
          width:      bw / scale + BOX_PADDING * 2,
          height:     bh / scale + BOX_PADDING * 2,
          confidence: maxConf,
          className:  className,
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

      // ── F. Visual IOU tracker ──────────────────────────────────────
      const nowTrack    = performance.now();
      const prevTracks  = tracks;
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
          // ── EMA smoothing ─────────────────────────────────────────────────
          // Blend the incoming YOLO coordinates with the stored track position.
          // The raw box (used above by computeIou) is unchanged so matching
          // accuracy is not affected. Only the persisted track coordinates are
          // smoothed, which determines the crop geometry in the next frame.
          const prev = bestTrack.box;
          const smoothedBox: YoloBox = {
            ...box,
            x:      box.x      * EMA_ALPHA + prev.x      * (1 - EMA_ALPHA),
            y:      box.y      * EMA_ALPHA + prev.y      * (1 - EMA_ALPHA),
            width:  box.width  * EMA_ALPHA + prev.width  * (1 - EMA_ALPHA),
            height: box.height * EMA_ALPHA + prev.height * (1 - EMA_ALPHA),
          };
          nextTracks.push({
            trackId:  bestTrack.trackId,
            box:      smoothedBox,
            lastSeen: nowTrack,
          });
        } else {
          // New detection: no prior position to interpolate against.
          // Use raw YOLO coordinates as-is.
          nextTracks.push({
            trackId:  crypto.randomUUID(),
            box,
            lastSeen: nowTrack,
          });
        }
      }

      for (const track of prevTracks) {
        if (matchedPrev.has(track.trackId)) continue;
        if (nowTrack - track.lastSeen < TRACK_STALE_MS) {
          nextTracks.push(track);
        }
      }

      tracks = nextTracks;

      self.postMessage({
        type: 'DETECT_SUCCESS',
        detections: kept,
        trackedBoxes: nextTracks
      } as YoloWorkerResponse);
    }
  } catch (err) {
    console.error('[YOLO Worker] Error:', err);
    self.postMessage({
      type: req.type === 'INIT' ? 'INIT_ERROR' : 'ERROR',
      error: String(err)
    } as YoloWorkerResponse);
  }
};
