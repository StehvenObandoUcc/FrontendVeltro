/**
 * useAiScanQueue — The Consumer
 *
 * Single responsibility: watch the store for RAW detections, crop the video
 * frame, and call the backend CLIP vector-search endpoint. Updates store state
 * atomically via the actions defined in aiScanStore.
 * No rendering logic. No canvas drawing.
 */

import { useEffect, useRef } from 'react';
import { useAiScanStore } from '../stores/aiScanStore';
import { posApi } from '../api/pos';
import { samMaskCache } from '../workers/samMaskCache';

const API_COOLDOWN_MS    = 2000;  // 2s between backend calls

export const useAiScanQueue = (
  videoRef: React.RefObject<HTMLVideoElement>,
) => {
  const aiEnabled           = useAiScanStore((s) => s.aiEnabled);
  const detections         = useAiScanStore((s) => s.detections);
  const setIsProcessing    = useAiScanStore((s) => s.setIsProcessing);
  const updateStatus       = useAiScanStore((s) => s.updateDetectionStatus);
  const updateMatches      = useAiScanStore((s) => s.updateDetectionMatches);

  const cooldownRef        = useRef(0);
  const isBusyRef          = useRef(false);
  const cropCanvasRef      = useRef<HTMLCanvasElement | null>(null);
  const cropCtxRef         = useRef<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    if (!aiEnabled || isBusyRef.current) return;

    // Pick the highest-confidence RAW box
    const candidate = detections
      .filter((d) => d.status === 'RAW')
      .sort((a, b) => b.confidence - a.confidence)[0];

    if (!candidate) return;

    // Enforce cooldown
    const elapsed = Date.now() - cooldownRef.current;
    if (elapsed < API_COOLDOWN_MS) return;

    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;

    const process = async () => {
      isBusyRef.current = true;
      cooldownRef.current = Date.now();
      setIsProcessing(true);
      updateStatus(candidate.id, 'PENDING');

      try {
        // ── Crop bounding box from live video frame ──────────────────────────
        const x = Math.max(0, Math.round(candidate.x));
        const y = Math.max(0, Math.round(candidate.y));
        const w = Math.min(video.videoWidth  - x, Math.round(candidate.width));
        const h = Math.min(video.videoHeight - y, Math.round(candidate.height));

        if (w <= 0 || h <= 0) {
          console.warn('[Queue] Invalid crop dimensions:', { x, y, w, h });
          updateStatus(candidate.id, 'ERROR');
          return;
        }

        // Upscale small crops to a minimum of 224×224px for CLIP compatibility.
        // CLIP was trained on 224px images — sending smaller crops kills recall.
        const MIN_CLIP_SIZE = 224;
        const cropW = Math.max(w, MIN_CLIP_SIZE);
        const cropH = Math.max(h, MIN_CLIP_SIZE);

        // Reuse a persistent canvas instead of creating a new one per detection.
        // Assigning .width/.height clears the bitmap (HTML spec) — correct behaviour.
        if (!cropCanvasRef.current) {
          cropCanvasRef.current = document.createElement('canvas');
          cropCtxRef.current = cropCanvasRef.current.getContext('2d', { willReadFrequently: true })!;
        }
        const crop = cropCanvasRef.current;
        const ctx = cropCtxRef.current!;
        crop.width  = cropW;
        crop.height = cropH;

        // Use imageSmoothingQuality 'high' to reduce blur on upscale
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(video, x, y, w, h, 0, 0, cropW, cropH);

        const mask = samMaskCache.getMask(candidate.id);
        if (mask) {
          const videoW = video.videoWidth;
          const videoH = video.videoHeight;
          const scaleSam = Math.min(1024 / videoW, 1024 / videoH);
          const dxSam = (1024 - videoW * scaleSam) / 2;
          const dySam = (1024 - videoH * scaleSam) / 2;

          const imageData = ctx.getImageData(0, 0, cropW, cropH);
          const pixels = imageData.data;

          for (let py = 0; py < cropH; py++) {
            for (let px = 0; px < cropW; px++) {
              // Map crop coordinates back to original video dimensions
              const vx = x + (px * w) / cropW;
              const vy = y + (py * h) / cropH;

              // Map original video coordinates to SAM 2 mask coordinates
              const mx = Math.floor(vx * scaleSam + dxSam);
              const my = Math.floor(vy * scaleSam + dySam);

              if (mx >= 0 && mx < 1024 && my >= 0 && my < 1024) {
                const maskVal = mask.maskData[my * 1024 + mx];
                if (maskVal === 0) {
                  // Background pixel -> set to white (R, G, B = 255)
                  const idx = (py * cropW + px) * 4;
                  pixels[idx] = 255;     // R
                  pixels[idx + 1] = 255; // G
                  pixels[idx + 2] = 255; // B
                }
              } else {
                // Out of mask bounds -> treat as background -> set to white
                const idx = (py * cropW + px) * 4;
                pixels[idx] = 255;
                pixels[idx + 1] = 255;
                pixels[idx + 2] = 255;
              }
            }
          }
          ctx.putImageData(imageData, 0, 0);
        }

        // ── Encode crop to JPEG ──────────────────────────────────────────────
        // Quality 0.75: CLIP operates on 224×224 normalised tensors, making it
        // highly tolerant of JPEG compression. Going from 0.92 → 0.75 cuts
        // payload size by ~25-35% with negligible impact on embedding quality.
        // Do NOT switch to WebP: Java's ImageIO.read() does not support WebP
        // natively and would require an additional backend dependency.
        const blob = await new Promise<Blob | null>((res) =>
          crop.toBlob((b) => res(b), 'image/jpeg', 0.75)
        );
        if (!blob || blob.size === 0) throw new Error('Empty blob');
        if (import.meta.env.DEV) {
          console.log(`[Queue] Crop blob: ${(blob.size / 1024).toFixed(1)} KB (JPEG 0.75)`);
        }



        // ── Send to backend POST /api/v1/scanner/ai ──────────────────────────
        const data = await posApi.aiDetectFrame(blob, `crop_${candidate.id.slice(0, 8)}.jpg`);

        if (data?.length && data[0].matches?.length) {
          const matches = data[0].matches;

          updateMatches(candidate.id, matches);
          updateStatus(candidate.id, 'SUCCESS');
        } else {

          updateStatus(candidate.id, 'ERROR');
        }
      } catch (err) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 404 || status === 0) {
          // No match found - expected case, no logging needed
        } else {
          console.error('[Queue] Backend call failed:', err);
        }
        updateStatus(candidate.id, 'ERROR');
      } finally {
        setIsProcessing(false);
        isBusyRef.current = false;
      }
    };

    process();
  }, [detections, aiEnabled, setIsProcessing, updateStatus, updateMatches, videoRef]);

  return {};
};
