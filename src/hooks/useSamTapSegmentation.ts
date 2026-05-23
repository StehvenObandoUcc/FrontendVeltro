/**
 * useSamTapSegmentation — Independent SAM Zone-Segment Pipeline
 *
 * Fully independent from YOLO. Auto-segments a fixed detection zone:
 *   1. Every SCAN_INTERVAL_MS, captures the frame and sends zone center to SAM
 *   2. SAM returns mask → stored in samMaskCache → SegmentationOverlay renders it
 *   3. Mask applied to crop product (white bg) → CLIP identifies via /scanner/ai
 *   4. Stale detection: when product leaves zone, clears and rescans
 *
 * Single product at a time — zone-based, no user interaction needed.
 */

import { useEffect, useRef } from 'react';
import { useAiScanStore } from '../stores/aiScanStore';
import { samMaskCache } from '../workers/samMaskCache';
import { segmentWithAI } from '../api/aiScannerApi';
import { posApi } from '../api/pos';

// ── Constants ────────────────────────────────────────────────────────────────
const SAM_CANVAS_SIZE = 1024;
const SCAN_INTERVAL_MS = 3000;
const STALE_CHECK_INTERVAL_MS = 2000;
const STALE_COLOR_THRESHOLD = 60;
const STALE_TTL_MS = 20_000;
const CIRCUIT_BREAKER_LIMIT = 3;
const PIXEL_SAMPLE_SIZE = 8;

// Fixed zone: centered, 70% width x 70% height (normalized 0–1)
const ZONE_START_X = 0.15;
const ZONE_START_Y = 0.15;
const ZONE_END_X = 0.85;
const ZONE_END_Y = 0.85;
const ZONE_CENTER_X = (ZONE_START_X + ZONE_END_X) / 2;
const ZONE_CENTER_Y = (ZONE_START_Y + ZONE_END_Y) / 2;

// Consistent entry ID for the single zone entry
const ZONE_ENTRY_ID = 'sam-zone-entry';

// ── Pixel Sampling ───────────────────────────────────────────────────────────

let sampleCanvas: HTMLCanvasElement | null = null;
let sampleCtx: CanvasRenderingContext2D | null = null;

function ensureSampleCanvas(): CanvasRenderingContext2D {
  if (!sampleCanvas) {
    sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = PIXEL_SAMPLE_SIZE;
    sampleCanvas.height = PIXEL_SAMPLE_SIZE;
    sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });
  }
  return sampleCtx!;
}

function samplePixelBlock(
  video: HTMLVideoElement,
  nx: number,
  ny: number,
): [number, number, number] {
  const ctx = ensureSampleCanvas();
  const vx = nx * video.videoWidth - PIXEL_SAMPLE_SIZE / 2;
  const vy = ny * video.videoHeight - PIXEL_SAMPLE_SIZE / 2;

  ctx.drawImage(
    video,
    Math.max(0, vx), Math.max(0, vy),
    PIXEL_SAMPLE_SIZE, PIXEL_SAMPLE_SIZE,
    0, 0,
    PIXEL_SAMPLE_SIZE, PIXEL_SAMPLE_SIZE,
  );

  const data = ctx.getImageData(0, 0, PIXEL_SAMPLE_SIZE, PIXEL_SAMPLE_SIZE).data;
  let r = 0, g = 0, b = 0;
  const total = PIXEL_SAMPLE_SIZE * PIXEL_SAMPLE_SIZE;

  for (let i = 0; i < data.length; i += 4) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
  }

  return [r / total, g / total, b / total];
}

function colorDistance(a: [number, number, number], b: [number, number, number]): number {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
}

// ── Mask Helpers ─────────────────────────────────────────────────────────────

/**
 * Decodes a base64 PNG mask into a flat 1024×1024 Uint8Array binary mask.
 * The SAM API returns a PNG image where white pixels = mask, black = background.
 * We load the PNG, draw it to a canvas, and extract pixel data to create
 * a flat array where 1 = mask, 0 = background.
 */
async function decodeMaskPng(base64: string): Promise<Uint8Array> {
  const raw = base64.replace(/^data:image\/.*;base64,/, '');
  const dataUrl = `data:image/png;base64,${raw}`;

  // Load PNG as Image
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });

  // Draw to a temporary canvas
  const canvas = document.createElement('canvas');
  canvas.width = SAM_CANVAS_SIZE;
  canvas.height = SAM_CANVAS_SIZE;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, SAM_CANVAS_SIZE, SAM_CANVAS_SIZE);

  // Extract pixel data → flat binary mask
  const imageData = ctx.getImageData(0, 0, SAM_CANVAS_SIZE, SAM_CANVAS_SIZE);
  const pixels = imageData.data;
  const mask = new Uint8Array(SAM_CANVAS_SIZE * SAM_CANVAS_SIZE);

  for (let i = 0; i < mask.length; i++) {
    // Check if any RGB channel > 128 (mask pixel is white/bright in the PNG)
    const idx = i * 4;
    if (pixels[idx] > 128 || pixels[idx + 1] > 128 || pixels[idx + 2] > 128) {
      mask[i] = 1;
    }
  }

  return mask;
}

function getMaskBoundingRect(
  maskData: Uint8Array,
  size: number,
): { minX: number; minY: number; maxX: number; maxY: number } | null {
  let minX = size, minY = size, maxX = 0, maxY = 0;
  let found = false;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (maskData[y * size + x] === 1) {
        found = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  return found ? { minX, minY, maxX, maxY } : null;
}

function clearZoneEntry(): void {
  samMaskCache.deleteMask(ZONE_ENTRY_ID);
  const state = useAiScanStore.getState();
  if (state.samTapEntries.some((e) => e.id === ZONE_ENTRY_ID)) {
    state.removeSamTap(ZONE_ENTRY_ID);
  }
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export const useSamTapSegmentation = (
  videoRef: React.RefObject<HTMLVideoElement>,
  active: boolean,
) => {
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const isBusy = useRef(false);
  const consecutiveErrors = useRef(0);

  useEffect(() => {
    if (!active) {
      clearZoneEntry();
      useAiScanStore.getState().clearSamTaps();
      samMaskCache.clear();
      isBusy.current = false;
      consecutiveErrors.current = 0;
      return;
    }

    // Allocate persistent offscreen canvas
    const os = document.createElement('canvas');
    os.width = SAM_CANVAS_SIZE;
    os.height = SAM_CANVAS_SIZE;
    offscreenRef.current = os;
    ctxRef.current = os.getContext('2d', { willReadFrequently: true });

    // ── A. Auto-scan interval — segment zone center every N seconds ──────
    const scanInterval = setInterval(() => {
      if (isBusy.current) return;

      const video = videoRef.current;
      if (!video || video.readyState < 2 || video.videoWidth === 0) return;

      // Don't rescan if we already have a matched product
      const entries = useAiScanStore.getState().samTapEntries;
      const existing = entries.find((e) => e.id === ZONE_ENTRY_ID);
      if (existing && existing.status === 'matched') return;

      // Start a new scan cycle
      processZone();
    }, SCAN_INTERVAL_MS);

    // ── B. Stale detection — clear when product leaves zone ──────────────
    const staleInterval = setInterval(() => {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || video.videoWidth === 0) return;

      const entries = useAiScanStore.getState().samTapEntries;
      const entry = entries.find((e) => e.id === ZONE_ENTRY_ID);
      if (!entry || entry.status !== 'matched' || !entry.pixelSignature) return;

      // TTL fallback
      if (Date.now() - entry.timestamp > STALE_TTL_MS) {
        clearZoneEntry();
        return;
      }

      // Pixel-signature stale check at zone center
      const currentRgb = samplePixelBlock(video, ZONE_CENTER_X, ZONE_CENTER_Y);
      const distance = colorDistance(currentRgb, entry.pixelSignature);

      if (distance > STALE_COLOR_THRESHOLD) {
        clearZoneEntry();
      }
    }, STALE_CHECK_INTERVAL_MS);

    // Trigger first scan immediately
    const initialTimer = setTimeout(() => processZone(), 500);

    return () => {
      clearInterval(scanInterval);
      clearInterval(staleInterval);
      clearTimeout(initialTimer);
      clearZoneEntry();
      samMaskCache.clear();
      isBusy.current = false;
      consecutiveErrors.current = 0;
    };
  }, [active, videoRef]);

  // ── Zone Processing Pipeline ───────────────────────────────────────────
  async function processZone(): Promise<void> {
    const video = videoRef.current;
    const ctx = ctxRef.current;
    const osCanvas = offscreenRef.current;

    if (!video || !ctx || !osCanvas || video.readyState < 2 || video.videoWidth === 0) return;
    if (isBusy.current) return;

    isBusy.current = true;
    const store = useAiScanStore.getState();

    // Create or update zone entry
    const existingEntry = store.samTapEntries.find((e) => e.id === ZONE_ENTRY_ID);
    if (!existingEntry) {
      store.addSamTap({
        id: ZONE_ENTRY_ID,
        startX: ZONE_START_X,
        startY: ZONE_START_Y,
        endX: ZONE_END_X,
        endY: ZONE_END_Y,
        status: 'pending',
        timestamp: Date.now(),
      });
    } else {
      store.updateSamTap(ZONE_ENTRY_ID, { status: 'pending', timestamp: Date.now() });
    }

    try {
      // 1. Sample pixel signature at zone center
      const pixelSignature = samplePixelBlock(video, ZONE_CENTER_X, ZONE_CENTER_Y);
      useAiScanStore.getState().updateSamTap(ZONE_ENTRY_ID, {
        status: 'segmenting',
        pixelSignature,
      });

      // 2. Capture frame → letterboxed 1024×1024
      const w = video.videoWidth;
      const h = video.videoHeight;
      const scale = Math.min(SAM_CANVAS_SIZE / w, SAM_CANVAS_SIZE / h);
      const dw = w * scale;
      const dh = h * scale;
      const dx = (SAM_CANVAS_SIZE - dw) / 2;
      const dy = (SAM_CANVAS_SIZE - dh) / 2;

      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, SAM_CANVAS_SIZE, SAM_CANVAS_SIZE);
      ctx.drawImage(video, 0, 0, w, h, dx, dy, dw, dh);

      // 3. Map zone center → SAM 1024×1024 coords
      const samX = Math.round(ZONE_CENTER_X * w * scale + dx);
      const samY = Math.round(ZONE_CENTER_Y * h * scale + dy);

      // 4. Get frame blob
      const blob = await new Promise<Blob | null>((resolve) =>
        osCanvas.toBlob((b) => resolve(b), 'image/jpeg', 0.85),
      );
      if (!blob) throw new Error('Failed to create frame blob');

      // 5. Call SAM segmentation
      const maskBase64 = await segmentWithAI(blob, samX, samY);
      if (!maskBase64) throw new Error('SAM returned no mask');

      // 6. Decode PNG mask → flat binary array for overlay and crop
      const maskData = await decodeMaskPng(maskBase64);

      // 7. Clip mask to zone boundaries (prevents overlay spilling outside)
      const zoneMinX = Math.floor(ZONE_START_X * w * scale + dx);
      const zoneMinY = Math.floor(ZONE_START_Y * h * scale + dy);
      const zoneMaxX = Math.ceil(ZONE_END_X * w * scale + dx);
      const zoneMaxY = Math.ceil(ZONE_END_Y * h * scale + dy);

      for (let y = 0; y < SAM_CANVAS_SIZE; y++) {
        for (let x = 0; x < SAM_CANVAS_SIZE; x++) {
          if (x < zoneMinX || x > zoneMaxX || y < zoneMinY || y > zoneMaxY) {
            maskData[y * SAM_CANVAS_SIZE + x] = 0;
          }
        }
      }

      samMaskCache.setMask(ZONE_ENTRY_ID, {
        detectionId: ZONE_ENTRY_ID,
        maskData,
        maskWidth: SAM_CANVAS_SIZE,
        maskHeight: SAM_CANVAS_SIZE,
      });
      useAiScanStore.getState().setSegmentationStatus(ZONE_ENTRY_ID, 'ready');
      useAiScanStore.getState().updateSamTap(ZONE_ENTRY_ID, { status: 'matching' });

      // 7. Apply mask to crop product (white background for non-mask pixels)
      const imageData = ctx.getImageData(0, 0, SAM_CANVAS_SIZE, SAM_CANVAS_SIZE);
      const pixels = imageData.data;

      for (let i = 0; i < SAM_CANVAS_SIZE * SAM_CANVAS_SIZE; i++) {
        if (maskData[i] !== 1) {
          const idx = i * 4;
          pixels[idx] = 255;
          pixels[idx + 1] = 255;
          pixels[idx + 2] = 255;
        }
      }
      ctx.putImageData(imageData, 0, 0);

      // 8. Crop to mask bounding rect for tighter CLIP input
      const bounds = getMaskBoundingRect(maskData, SAM_CANVAS_SIZE);
      let cropBlob: Blob | null;

      if (bounds) {
        const cropW = bounds.maxX - bounds.minX + 1;
        const cropH = bounds.maxY - bounds.minY + 1;
        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = Math.max(cropW, 224);
        cropCanvas.height = Math.max(cropH, 224);
        const cropCtx = cropCanvas.getContext('2d')!;
        cropCtx.fillStyle = '#fff';
        cropCtx.fillRect(0, 0, cropCanvas.width, cropCanvas.height);
        cropCtx.drawImage(
          osCanvas,
          bounds.minX, bounds.minY, cropW, cropH,
          0, 0, cropCanvas.width, cropCanvas.height,
        );
        cropBlob = await new Promise<Blob | null>((r) =>
          cropCanvas.toBlob((b) => r(b), 'image/jpeg', 0.92),
        );
      } else {
        cropBlob = blob;
      }

      if (!cropBlob) throw new Error('Failed to create crop blob');

      // 9. CLIP match via /scanner/ai (not /scanner/detect which may 404)
      const response = await posApi.aiScanProduct(
        cropBlob,
        `sam_zone_${Date.now()}.jpg`,
      );

      if (response?.suggestions?.length) {
        const suggestion = response.suggestions[0];
        useAiScanStore.getState().updateSamTap(ZONE_ENTRY_ID, {
          status: 'matched',
          matchedProduct: {
            id: suggestion.productId ?? 0,
            name: suggestion.productName,
            sku: null,
            barcode: suggestion.barcode,
            salePrice: suggestion.suggestedPrice ?? '0',
          },
        });
      } else {
        useAiScanStore.getState().updateSamTap(ZONE_ENTRY_ID, { status: 'error' });
      }

      consecutiveErrors.current = 0;
    } catch (err) {
      console.error('[SAM Zone] Pipeline error:', err);
      useAiScanStore.getState().updateSamTap(ZONE_ENTRY_ID, { status: 'error' });
      consecutiveErrors.current += 1;

      if (consecutiveErrors.current >= CIRCUIT_BREAKER_LIMIT) {
        useAiScanStore.getState().setSamGlobalError(true);
      }
    } finally {
      isBusy.current = false;
    }
  }
};
