import { useRef, useEffect, useState, useCallback } from 'react';
import { CameraOff, Loader2, CheckCircle, X } from 'lucide-react';
import { useAiScanStore } from '../../stores/aiScanStore';
import { useCartStore } from '../../stores/cartStore';
import { useYoloDetection } from '../../hooks/useYoloDetection';
import { useAiScanQueue } from '../../hooks/useAiScanQueue';
import { useCameraStream } from '../../hooks/useCameraStream';
import { DetectionOverlay } from './DetectionOverlay';
import { useSamSegmentation } from '../../hooks/useSamSegmentation';
import { SegmentationOverlay } from './SegmentationOverlay';
import { ModelControlBar } from './ModelControlBar';

interface ConfirmedProduct {
  productId: number;
  productName: string;
}

interface Props {
  useCase?: 'pos-sell' | 'inventory-count';
  onDetectionConfirmed?: (product: ConfirmedProduct) => void;
}

const REJECTION_TTL_MS = 30000;

export const AiScannerContainer: React.FC<Props> = ({
  useCase = 'pos-sell',
  onDetectionConfirmed,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const addedIds = useRef<Set<string>>(new Set());
  const confirmedIds = useRef<Set<string>>(new Set());
  const rejectedProducts = useRef<Map<number, number>>(new Map());

  const [toast, setToast] = useState<string | null>(null);

  const scanMode = useAiScanStore((s) => s.scanMode);
  const setAiUseCase = useAiScanStore((s) => s.setAiUseCase);
  const setAiEnabled = useAiScanStore((s) => s.setAiEnabled);
  const detections = useAiScanStore((s) => s.detections);
  const isProcessing = useAiScanStore((s) => s.isProcessing);
  const updateDetectionStatus = useAiScanStore((s) => s.updateDetectionStatus);
  const clearDetections = useAiScanStore((s) => s.clearDetections);
  const samGlobalError = useAiScanStore((s) => s.samGlobalError);

  const { add: addToCart } = useCartStore();
  const isAiMode = scanMode === 'ai';

  const onCameraStop = useCallback(() => {
    clearDetections();
    confirmedIds.current.clear();
    rejectedProducts.current.clear();
  }, [clearDetections]);

  const {
    cameraActive,
    cameraError,
    isCameraInitializing,
    restartCamera,
  } = useCameraStream({
    videoRef,
    onStop: onCameraStop,
  });

  const { modelLoaded, modelError } = useYoloDetection(videoRef, canvasRef, cameraActive && isAiMode);

  useAiScanQueue(videoRef);

  useSamSegmentation(videoRef, cameraActive && isAiMode && !samGlobalError);

  // Lifecycle: enable AI when this container mounts, disable on unmount
  useEffect(() => {
    setAiEnabled(true);
    return () => setAiEnabled(false);
  }, [setAiEnabled]);

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

    const live = new Set(detections.map((d) => d.id));
    addedIds.current = new Set([...addedIds.current].filter((id) => live.has(id)));
  }, [detections, addToCart, updateDetectionStatus, useCase]);

  const getValidMatch = (detectionId: string) => {
    const det = detections.find((d) => d.id === detectionId);
    if (!det || det.matches.length === 0) return null;
    return det.matches[0];
  };

  const handleConfirmDetection = (detectionId: string) => {
    const match = getValidMatch(detectionId);
    if (!match) return;
    confirmedIds.current.add(detectionId);
    updateDetectionStatus(detectionId, 'ADDED');
    onDetectionConfirmed?.({ productId: match.id, productName: match.name });
  };

  const handleRejectDetection = (detectionId: string) => {
    const match = getValidMatch(detectionId);
    confirmedIds.current.add(detectionId);
    updateDetectionStatus(detectionId, 'ERROR');
    if (match) {
      rejectedProducts.current.set(match.id, Date.now() + REJECTION_TTL_MS);
    }
  };

  useEffect(() => {
    const now = Date.now();
    rejectedProducts.current.forEach((expiresAt, productId) => {
      if (expiresAt <= now) {
        rejectedProducts.current.delete(productId);
      }
    });
  }, [detections]);

  useEffect(() => {
    if (useCase) {
      setAiUseCase(useCase);
    }
  }, [useCase, setAiUseCase]);

  const pendingDetections = detections.filter((det) => {
    if (det.status !== 'SUCCESS' || confirmedIds.current.has(det.id)) {
      return false;
    }
    const productId = det.matches[0]?.id;
    if (!productId) return true;
    const rejectionUntil = rejectedProducts.current.get(productId);
    return !rejectionUntil || rejectionUntil <= Date.now();
  });

  if (cameraError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-xl bg-red-50 border border-red-200">
        <CameraOff className="w-12 h-12 mb-3 text-red-400" />
        <p className="font-semibold text-red-600">Error de cámara</p>
        <p className="text-sm mt-1 text-gray-500">{cameraError}</p>
        <button
          onClick={restartCamera}
          disabled={isCameraInitializing}
          className="mt-4 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isCameraInitializing ? 'Reintentando...' : 'Reintentar'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative w-full overflow-hidden rounded-xl bg-black" style={{ aspectRatio: '4 / 3' }}>
        <ModelControlBar />
        <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted />
        {isAiMode && !samGlobalError && <SegmentationOverlay videoRef={videoRef} />}
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
        {isAiMode && <DetectionOverlay canvasRef={canvasRef} />}

        {!cameraActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-10">
            <Loader2 className="w-8 h-8 animate-spin text-white" />
          </div>
        )}

        {cameraActive && isAiMode && !modelLoaded && !modelError && (
          <div className="absolute bottom-3 inset-x-0 flex justify-center z-10">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 text-white text-xs">
              <Loader2 className="w-3 h-3 animate-spin" />
              Cargando modelo IA...
            </span>
          </div>
        )}

        {modelError && isAiMode && (
          <div className="absolute bottom-3 inset-x-0 flex justify-center z-10">
            <span className="px-3 py-1 rounded-full bg-red-600 text-white text-xs">Error al cargar modelo IA</span>
          </div>
        )}

        {toast && (
          <div className="absolute top-3 inset-x-0 flex justify-center z-20">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500 text-white text-sm font-semibold shadow-lg">
              <CheckCircle className="w-4 h-4" />
              {toast} agregado al carrito
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 px-1">
        <span>
          Detectados: <strong className="text-gray-900">{detections.length}</strong>
        </span>

        {isAiMode && isProcessing && (
          <span className="flex items-center gap-1 text-blue-600 font-medium">
            <Loader2 className="w-3 h-3 animate-spin" />
            Identificando...
          </span>
        )}

        {isAiMode && modelLoaded && !isProcessing && detections.length === 0 && (
          <span className="text-amber-600">Apunta la camara a un producto</span>
        )}
      </div>

      {useCase === 'inventory-count' && pendingDetections.length > 0 && (
        <div className="card p-4 space-y-2">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Detecciones pendientes</h3>
          {pendingDetections.map((det) => {
            const match = det.matches[0];
            return (
              <div key={det.id} className="flex items-center justify-between gap-3 border border-[var(--border-light)] rounded-lg p-2">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {match ? match.name : 'Identificacion no disponible'}
                  </p>
                  {match && <p className="text-xs text-[var(--text-tertiary)]">ID: {match.id}</p>}
                </div>
                {match ? (
                  <div className="flex gap-2">
                    <button onClick={() => handleConfirmDetection(det.id)} className="btn-primary px-3 py-1 text-xs">
                      Confirmar
                    </button>
                    <button onClick={() => handleRejectDetection(det.id)} className="btn-secondary px-3 py-1 text-xs inline-flex items-center gap-1">
                      <X className="w-3 h-3" /> Rechazar
                    </button>
                  </div>
                ) : (
                  <span className="badge badge-warning">Identificacion no disponible</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};


