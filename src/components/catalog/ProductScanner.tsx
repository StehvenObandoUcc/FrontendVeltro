import { useEffect, useState, useCallback, useRef } from 'react';
import { Camera, X } from 'lucide-react';
import { productApi } from '../../api/catalog';
import { posApi, type SuggestedProduct } from '../../api/pos';
import { useBarcodeScanner } from '../../hooks';
import type { CameraFeedbackState } from '../../hooks/useBarcodeScanner';

export interface ScannedProductData {
  /** If product already exists in DB */
  existsInDb: boolean;
  existingProductId?: number;
  /** Fields to auto-fill the form */
  name?: string;
  barcode?: string;
  description?: string;
  suggestedPrice?: string;
  categoryName?: string;
  /** AI confidence if identified by AI */
  confidence?: number;
  source: 'barcode-db' | 'barcode-new' | 'ai';
}

interface ProductScannerProps {
  onResult: (data: ScannedProductData) => void;
  /** Allow closing/collapsing the scanner */
  onClose?: () => void;
}

/**
 * ProductScanner — Camera-based barcode scanner + AI identification
 * for the product creation/edit form. Scans a barcode and checks if the
 * product already exists; if not, uses AI to identify and suggest fields.
 */
export const ProductScanner: React.FC<ProductScannerProps> = ({ onResult, onClose }) => {
  const [aiAvailable, setAiAvailable] = useState(false);
  const [showAiButton, setShowAiButton] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // AI modal state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<SuggestedProduct[] | null>(null);
  const setTransientFeedbackRef = useRef<(state: CameraFeedbackState) => void>(() => {});

  // ----- Handle Handlers First -----
  const handleBarcodeScan = useCallback(
    async (barcode: string) => {
      const code = barcode.trim();
      if (!code) return;

      setScanning(true);
      setStatus('Comprobando base de datos...');
      setError(null);

      try {
        const product = await productApi.getByBarcode(code);
        onResult({
          existsInDb: true,
          existingProductId: product.id,
          name: product.name,
          barcode: product.barcode || undefined,
          description: product.description || undefined,
          suggestedPrice: product.salePrice,
          source: 'barcode-db',
        });
        setStatus('¡Producto encontrado en DB!');
        setTransientFeedbackRef.current('product-added');
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number }; status?: number })?.response?.status
          ?? (err as { status?: number })?.status;
        if (status === 404) {
          onResult({
            existsInDb: false,
            barcode: code,
            source: 'barcode-new',
          });
          setStatus('Nuevo código detectado.');
          setTransientFeedbackRef.current('not-found');
        } else {
          console.error(err);
          onResult({
            existsInDb: false,
            barcode: code,
            source: 'barcode-new',
          });
          setStatus('Nuevo código detectado.');
          setTransientFeedbackRef.current('not-found');
        }
      } finally {
        setScanning(false);
      }
    },
    [onResult]
  );

  const {
    cameraReady,
    cameraFeedback,
    error: cameraError,
    setError: setCameraError,
    setTransientFeedback,
  } = useBarcodeScanner({
    readerId: 'catalog-reader',
    enabled: true, // Keep camera running during AI load to prevent html5-qrcode restart hangs
    onDecode: handleBarcodeScan,
    startDelayMs: 200,
    stopOnDecode: true,
    startErrorMessage: 'No se pudo iniciar la cámara. Verifica permisos del navegador.',
  });

  useEffect(() => {
    setTransientFeedbackRef.current = setTransientFeedback;
  }, [setTransientFeedback]);

  useEffect(() => {
    if (cameraError) {
      setError(cameraError);
    }
  }, [cameraError]);

  // Check AI on mount
  useEffect(() => {
    posApi.checkAiAvailable()
      .then((res) => {
        setAiAvailable(res.available);
      })
      .catch((err) => {
        console.warn('[Catalog Scanner] AI availability check failed:', err?.message || err);
        setAiAvailable(false);
      });
  }, []);

  // Show AI button immediately
  useEffect(() => {
    if (!cameraReady || !aiAvailable || scanning || aiLoading) {
      setShowAiButton(false);
      return;
    }
    setShowAiButton(true);
  }, [cameraReady, aiAvailable, scanning, aiLoading]);

  // Clear error after delay
  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(t);
    }
  }, [error]);

  /** Capture frame and send to AI */
  const handleAiCapture = useCallback(() => {
    const video = document.querySelector('#catalog-reader video') as HTMLVideoElement;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      async (blob) => {
        if (!blob) return;
        setAiLoading(true);
        setError(null);
        setStatus('Analizando imagen con IA...');
        setAiSuggestions(null);

        try {
          const res = await posApi.aiScanProduct(blob, `product-scan-${Date.now()}.jpg`);
          const suggestions = res.suggestions;

          if (suggestions.length === 0) {
            setError('La IA no pudo identificar el producto. Intenta con otra imagen.');
            setStatus(null);
          } else {
            setAiSuggestions(suggestions);
            setStatus(`IA encontró ${suggestions.length} sugerencia(s)`);
          }
        } catch {
          setError('Error al conectar con el servicio de IA.');
          setStatus(null);
        } finally {
          setAiLoading(false);
          setCameraError(null);
        }
      },
      'image/jpeg',
      0.85
    );
  }, [setCameraError]);

  /** User selects an AI suggestion */
  const handleSelectSuggestion = useCallback(
    async (suggestion: SuggestedProduct) => {
      // We want to use the pure AI suggestion for creating a new product, ignoring the DB match
      const effectiveBarcode = suggestion.suggestedBarcode || undefined;
      const effectiveName = suggestion.suggestedName || suggestion.productName || '';

      // Check if this product already exists by barcode
      let existsInDb = false;
      let existingId: number | undefined;

      if (effectiveBarcode) {
        try {
          const product = await productApi.getByBarcode(effectiveBarcode);
          existsInDb = true;
          existingId = product.id;
        } catch {
          // not found — that's fine
        }
      }

      onResult({
        existsInDb,
        existingProductId: existingId,
        name: effectiveName,
        barcode: effectiveBarcode || undefined,
        suggestedPrice: suggestion.suggestedPrice || undefined,
        confidence: suggestion.confidence,
        source: 'ai',
      });

      setAiSuggestions(null);
      setStatus(`Campos llenados con: ${effectiveName}`);
    },
    [onResult]
  );

  const getConfidenceStyle = (confidence: number) => {
    const pct = Math.round(confidence * 100);
    if (pct >= 75) return { pct, color: 'text-[#038E57]' };
    if (pct >= 45) return { pct, color: 'text-[#FFAC00]' };
    return { pct, color: 'text-[#FF2E21]' };
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
          <Camera className="w-4 h-4 text-[var(--primary-base)]" />
          Escáner de Producto
        </h3>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
          >
            Cerrar <X className="w-3 h-3 inline" />
          </button>
        )}
      </div>

      {/* Camera feed */}
      <div className="relative rounded-xl overflow-hidden border border-[var(--border-default)] bg-black">
        <div
          id="catalog-reader"
          className="w-full h-44 sm:h-52 flex items-center justify-center bg-black overflow-hidden [&_video]:object-cover"
          style={{ width: '100%', height: '100%' }}
        />
        {/* Scanning guide overlay */}
        {cameraReady && !aiLoading && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-3/5 h-1/3 border-2 border-white/40 rounded-lg" />
          </div>
        )}
        {/* Loading camera */}
        {!cameraReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <div className="text-center text-white">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-white border-t-transparent mx-auto mb-2" />
              <p className="text-xs">Iniciando cámara...</p>
            </div>
          </div>
        )}
        {/* AI loading overlay */}
        {aiLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <div className="text-center text-white">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-purple-400 border-t-transparent mx-auto mb-2" />
              <p className="text-xs">Analizando con IA...</p>
            </div>
          </div>
        )}
        {/* Scanning indicator */}
        {scanning && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-center text-white">
              <div className="animate-spin rounded-full h-6 w-6 border-4 border-green-400 border-t-transparent mx-auto mb-2" />
              <p className="text-xs">Buscando producto...</p>
            </div>
          </div>
        )}
      </div>

      {/* AI Button — appears after 3s */}
      {showAiButton && !aiLoading && !aiSuggestions && (
        <button
          type="button"
          onClick={handleAiCapture}
          disabled={!cameraReady}
          className="w-full py-2.5 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-medium rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all shadow-sm flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
          </svg>
          Identificar con IA
        </button>
      )}

      {/* AI Suggestions inline */}
      {aiSuggestions && aiSuggestions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-[var(--text-secondary)]">Sugerencias de IA:</p>
          {aiSuggestions.map((s, idx) => {
            const { pct, color } = getConfidenceStyle(s.confidence);
            const displayBarcode = s.barcode || s.suggestedBarcode;
            const displayName = s.productName || s.suggestedName || 'Producto';
            return (
              <div
                key={s.productId ?? `ai-${idx}`}
                className="flex items-center justify-between p-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-secondary)] hover:shadow-sm transition-shadow"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {displayName}
                  </p>
                  <div className="flex gap-2 text-xs text-[var(--text-muted)]">
                    {displayBarcode && <span>Cód: {displayBarcode}</span>}
                    {s.suggestedPrice && <span>~$ {parseFloat(s.suggestedPrice).toFixed(2)}</span>}
                    {!s.productId && <span className="text-amber-600">Nuevo</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-3">
                  <span className={`text-lg font-bold ${color}`}>{pct}%</span>
                  <button
                    type="button"
                    onClick={() => handleSelectSuggestion(s)}
                    className="px-3 py-1.5 bg-[var(--primary-base)] text-white text-xs font-medium rounded-lg hover:bg-[var(--primary-hover)] transition-colors"
                  >
                    Usar
                  </button>
                </div>
              </div>
            );
          })}
          <button
            type="button"
            onClick={() => setAiSuggestions(null)}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          >
            Descartar sugerencias
          </button>
        </div>
      )}

      {/* Status / Error */}
      {cameraFeedback !== 'idle' && (
        <div
          className={`rounded-lg border px-3 py-2 text-xs font-medium ${
            cameraFeedback === 'starting'
              ? 'border-blue-200 bg-blue-50 text-blue-700'
              : cameraFeedback === 'scanning'
                ? 'border-green-200 bg-green-50 text-green-700'
                : cameraFeedback === 'product-added'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : cameraFeedback === 'not-found'
                    ? 'border-amber-200 bg-amber-50 text-amber-700'
                    : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {cameraFeedback === 'starting' && 'Iniciando cámara...'}
          {cameraFeedback === 'scanning' && 'Escaneando código de barras...'}
          {cameraFeedback === 'product-added' && 'Producto encontrado en la base de datos.'}
          {cameraFeedback === 'not-found' && 'Código nuevo detectado. Puedes crear el producto.'}
          {cameraFeedback === 'camera-error' && 'Error de cámara. Verifica permisos e intenta de nuevo.'}
        </div>
      )}

      {status && !error && (
        <p className="text-xs text-[var(--primary-base)] font-medium">{status}</p>
      )}
      {error && (
        <p className="text-xs text-red-500 font-medium">{error}</p>
      )}

      <p className="text-xs text-[var(--text-muted)]">
        Apunta al código de barras del producto. Si no se detecta, usa IA para identificarlo y completar el formulario.
      </p>
    </div>
  );
};
