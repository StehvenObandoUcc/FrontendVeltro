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
import type { DetectMatch } from '../api/pos';
import type { MatchedProduct } from '../modules/types/ai.types';

const API_COOLDOWN_MS    = 1000;  // 1s between backend calls

export const useAiScanQueue = (
  videoRef: React.RefObject<HTMLVideoElement>,
  aiEnabled = true,
) => {
  const detections         = useAiScanStore((s) => s.detections);
  const setIsProcessing    = useAiScanStore((s) => s.setIsProcessing);
  const updateStatus       = useAiScanStore((s) => s.updateDetectionStatus);
  const updateMatches      = useAiScanStore((s) => s.updateDetectionMatches);

  const cooldownRef        = useRef(0);
  const isBusyRef          = useRef(false);

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

        const crop = document.createElement('canvas');
        crop.width  = cropW;
        crop.height = cropH;
        const ctx = crop.getContext('2d')!;

        // Use imageSmoothingQuality 'high' to reduce blur on upscale
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(video, x, y, w, h, 0, 0, cropW, cropH);

        const blob = await new Promise<Blob | null>((res) =>
          crop.toBlob((b) => res(b), 'image/jpeg', 0.92)
        );
        if (!blob || blob.size === 0) throw new Error('Empty blob');

        console.log(`[Queue] Crop: original=${w}×${h}px → sent=${cropW}×${cropH}px | blob=${blob.size} bytes`);

        // ── Send to backend POST /api/v1/scanner/ai ──────────────────────────
        const data = await posApi.aiDetectFrame(blob, `crop_${candidate.id.slice(0, 8)}.jpg`);

        if (data?.length && data[0].matches?.length) {
          const matches: MatchedProduct[] = data[0].matches.map((p: DetectMatch) => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            barcode: p.barcode,
            salePrice: p.salePrice,
          }));
          console.log(`[Queue] ✅ Match: ${matches[0].name} (CLIP verified)`);
          updateMatches(candidate.id, matches);
        } else {
          console.log('[Queue] No match found for candidate', candidate.id.slice(0, 8));
          updateStatus(candidate.id, 'ERROR');
        }
      } catch (err) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 404 || status === 0) {
          console.log('[Queue] No CLIP match found');
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
