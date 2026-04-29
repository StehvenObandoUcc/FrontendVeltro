/**
 * AiScannerContainer — The UI Orchestrator
 *
 * Owns the camera stream, canvas overlay, and the lifecycle of the two hooks.
 * Watches for SUCCESS detections and auto-adds them to the cart.
 */

import { useRef, useEffect, useState } from 'react';
import { CameraOff, Loader2, CheckCircle } from 'lucide-react';
import { useAiScanStore } from '../../stores/aiScanStore';
import { useCartStore } from '../../stores/cartStore';
import { useYoloDetection } from '../../hooks/useYoloDetection';
import { useAiScanQueue } from '../../hooks/useAiScanQueue';
import { DetectionOverlay } from './DetectionOverlay';

interface Props {
  useCase?: 'pos-sell' | 'inventory-count';
}



export const AiScannerContainer: React.FC<Props> = ({ useCase = 'pos-sell' }) => {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const addedIds  = useRef<Set<string>>(new Set());

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError,  setCameraError]  = useState<string | null>(null);
  const [toast,        setToast]        = useState<string | null>(null);

  const {
    scanMode,
    setAiUseCase,
    detections,
    isProcessing,
    updateDetectionStatus,
    clearDetections,
  } = useAiScanStore();

  const { add: addToCart } = useCartStore();

  const isAiMode = scanMode === 'ai';

  // ── Hook 1: YOLO (producer) — inference + IOU tracker, writes store.trackedBoxes ──
  const { modelLoaded, modelError } = useYoloDetection(videoRef, canvasRef, cameraActive && isAiMode);

  // ── Hook 2: API queue (consumer) ──────────────────────────────────────────
  useAiScanQueue(videoRef, isAiMode);

  // ── Auto-add successful detections to cart ────────────────────────────────
  useEffect(() => {
    if (useCase !== 'pos-sell') return;

    detections
      .filter((d) => d.status === 'SUCCESS' && d.matches.length > 0 && !addedIds.current.has(d.id))
      .forEach((det) => {
        addedIds.current.add(det.id);

        const match = det.matches[0];


        addToCart(match, 1);
        updateDetectionStatus(det.id, 'ADDED');
        setToast(match.name);
        setTimeout(() => setToast(null), 3000);
      });

    // Prune IDs that left the frame
    const live = new Set(detections.map((d) => d.id));
    addedIds.current = new Set([...addedIds.current].filter((id) => live.has(id)));
  }, [detections, addToCart, updateDetectionStatus, useCase]);

  // ── Camera lifecycle ──────────────────────────────────────────────────────
  const startCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err) {
      setCameraError(err instanceof Error ? err.message : 'Failed to access camera');
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
    clearDetections();
  };

  useEffect(() => {
    if (useCase) setAiUseCase(useCase);
    startCamera();
    return stopCamera;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);




  // ── Error state ───────────────────────────────────────────────────────────
  if (cameraError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-xl bg-red-50 border border-red-200">
        <CameraOff className="w-12 h-12 mb-3 text-red-400" />
        <p className="font-semibold text-red-600">Error de cámara</p>
        <p className="text-sm mt-1 text-gray-500">{cameraError}</p>
        <button
          onClick={startCamera}
          className="mt-4 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium"
        >
          Reintentar
        </button>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {/*
        STABLE camera container:
        - aspect-ratio: 4/3 → reserves height BEFORE video loads (no jump)
        - position: relative → canvas stacks on top via absolute positioning
      */}
      <div
        className="relative w-full overflow-hidden rounded-xl bg-black"
        style={{ aspectRatio: '4 / 3' }}
      >
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          muted
        />

        {/* Canvas overlay — pointer-events:none so clicks fall through to video */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />

        {/* DetectionOverlay — 60 FPS rAF loop, reads store.trackedBoxes */}
        {isAiMode && <DetectionOverlay canvasRef={canvasRef} />}

        {/* Camera loading spinner */}
        {!cameraActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-10">
            <Loader2 className="w-8 h-8 animate-spin text-white" />
          </div>
        )}

        {/* Model loading banner (AI mode only) */}
        {cameraActive && isAiMode && !modelLoaded && !modelError && (
          <div className="absolute bottom-3 inset-x-0 flex justify-center z-10">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 text-white text-xs">
              <Loader2 className="w-3 h-3 animate-spin" />
              Cargando modelo IA…
            </span>
          </div>
        )}

        {/* Model error banner */}
        {modelError && isAiMode && (
          <div className="absolute bottom-3 inset-x-0 flex justify-center z-10">
            <span className="px-3 py-1 rounded-full bg-red-600 text-white text-xs">
              Error al cargar modelo IA
            </span>
          </div>
        )}

        {/* Auto-added toast */}
        {toast && (
          <div className="absolute top-3 inset-x-0 flex justify-center z-20">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500 text-white text-sm font-semibold shadow-lg">
              <CheckCircle className="w-4 h-4" />
              {toast} agregado al carrito
            </div>
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between text-xs text-gray-500 px-1">
        <span>
          Detectados:{' '}
          <strong className="text-gray-900">{detections.length}</strong>
        </span>

        {isAiMode && isProcessing && (
          <span className="flex items-center gap-1 text-blue-600 font-medium">
            <Loader2 className="w-3 h-3 animate-spin" />
            Identificando…
          </span>
        )}

        {isAiMode && modelLoaded && !isProcessing && detections.length === 0 && (
          <span className="text-amber-600">
            Apunta la cámara a un producto
          </span>
        )}
      </div>
    </div>
  );
};
