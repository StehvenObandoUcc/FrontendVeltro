import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, Keyboard, X } from 'lucide-react';
import { useCartStore } from '../../stores/cartStore';
import { CameraErrorBoundary } from './CameraErrorBoundary';
import { posApi } from '../../api/pos';
import type { Product } from '../../types';
import type { AxiosError } from 'axios';

type ScannerMode = 'camera' | 'manual';
type CameraFeedbackState =
  | 'idle'
  | 'starting'
  | 'scanning'
  | 'product-added'
  | 'not-found'
  | 'camera-error';

const CAMERA_START_CONFIG = { facingMode: 'environment' };
const BARCODE_SCANNER_CONFIG = {
  fps: 10,
  qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
    const width = Math.floor(Math.min(viewfinderWidth * 0.8, viewfinderHeight * 0.8));
    const height = Math.floor(viewfinderHeight * 0.6);
    return {
      width: Math.max(50, width),
      height: Math.max(50, height),
    };
  },
  videoConstraints: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    facingMode: 'environment',
  },
};

export const ScannerContainer: React.FC = () => {
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Scanner state
  const [mode, setMode] = useState<ScannerMode>('camera');
  const [barcodeValue, setBarcodeValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // Camera state
  const [cameraReady, setCameraReady] = useState(false);
  const [lastBarcode, setLastBarcode] = useState<string | null>(null);
  const [cameraFeedback, setCameraFeedback] = useState<CameraFeedbackState>('idle');

  const addToCart = useCartStore((state) => state.add);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScannedTimeRef = useRef<number>(0);
  const lastScannedCodeRef = useRef<string | null>(null);
  const isMountedRef = useRef(false);
  const isStartingRef = useRef(false);
  const isStoppingRef = useRef(false);
  const stopPromiseRef = useRef<Promise<void> | null>(null);
  const startTokenRef = useRef(0);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isProcessingScanRef = useRef(false);
  const isHandlingScanRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current);
      }
    };
  }, []);

  const setTransientFeedback = useCallback((state: CameraFeedbackState) => {
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }

    setCameraFeedback(state);
    if (state === 'product-added' || state === 'not-found') {
      feedbackTimerRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          setCameraFeedback('scanning');
        }
      }, 1600);
    }
  }, []);

  // ----- Handlers -----

  /** Handle barcode scan (from camera or manual input) */
  const handleBarcodeScan = useCallback(
    async (barcode: string) => {
      const code = barcode.trim();
      if (!code || isProcessingScanRef.current) return;

      isProcessingScanRef.current = true;

      setError(null);
      setLoading(true);
      try {
        const response = await posApi.getProductByBarcode(code);
        const product = response;


        addToCart(product, 1);
        setSuccessMsg(`+ ${product.name}`);
        setTransientFeedback('product-added');
        setBarcodeValue('');
        barcodeInputRef.current?.focus();
      } catch (err) {
        const axiosError = err as AxiosError<{ message?: string }>;
        if (axiosError.response?.status === 422) {
          setError(
            axiosError.response.data?.message ||
              'Stock insuficiente para agregar este producto al carrito.'
          );
        } else {
          setError(`Producto no encontrado: ${code}`);
        }
        setTransientFeedback('not-found');
      } finally {
        setLoading(false);
        isProcessingScanRef.current = false;
      }
    },
    [addToCart, setTransientFeedback]
  );

  // ----- html5-qrcode camera barcode scanning -----
  const stopScanner = useCallback(async () => {
    if (isStoppingRef.current) {
      return stopPromiseRef.current ?? Promise.resolve();
    }

    const currentScanner = scannerRef.current;
    if (!currentScanner) {
      if (isMountedRef.current) {
        setCameraReady(false);
      }
      return;
    }

    isStoppingRef.current = true;
    const stopTask = (async () => {
      try {
        if (currentScanner.isScanning) {
          await currentScanner.stop();
        }
      } catch {
        // noop
      }

      try {
        await currentScanner.clear();
      } catch {
        // noop
      }

      if (scannerRef.current === currentScanner) {
        scannerRef.current = null;
      }

      if (isMountedRef.current) {
        setCameraReady(false);
      }
    })().finally(() => {
      isStoppingRef.current = false;
      stopPromiseRef.current = null;
    });

    stopPromiseRef.current = stopTask;
    return stopTask;
  }, []);

  const startScanner = useCallback(async () => {
    const readerEl = document.getElementById('reader');
    if (!readerEl) return;
    if (isStartingRef.current || isStoppingRef.current || scannerRef.current) return;

    if (stopPromiseRef.current) {
      await stopPromiseRef.current;
    }

    isStartingRef.current = true;
    const currentToken = ++startTokenRef.current;

    setCameraReady(false);
    setCameraFeedback('starting');
    setError(null);

    readerEl.innerHTML = '';

    const scanner = new Html5Qrcode('reader', {
      verbose: true,
      formatsToSupport: [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
      ],
    });
    scannerRef.current = scanner;

    const qrCodeSuccessCallback = async (decodedText: string) => {
      console.log('[POS Scanner] frame procesado - decodedText:', decodedText);
      const now = Date.now();
      if (
        decodedText &&
        (decodedText !== lastScannedCodeRef.current ||
          now - lastScannedTimeRef.current > 3000)
      ) {
        if (isHandlingScanRef.current) return;
        isHandlingScanRef.current = true;
        lastScannedCodeRef.current = decodedText;
        lastScannedTimeRef.current = now;
        setLastBarcode(decodedText);
        try {
          await handleBarcodeScan(decodedText);
        } finally {
          isHandlingScanRef.current = false;
        }
      }
    };

    try {
      await scanner.start(
        CAMERA_START_CONFIG,
        BARCODE_SCANNER_CONFIG,
        qrCodeSuccessCallback,
        () => {
          // noop
        }
      );

      if (!isMountedRef.current || startTokenRef.current !== currentToken) {
        await stopScanner();
        return;
      }

      setCameraReady(true);
      const readerEl = document.getElementById('reader');
      if (readerEl) {
        const rect = readerEl.getBoundingClientRect();
        console.log('[POS Scanner] reader dimensions:', rect.width, 'x', rect.height);
      }
      setCameraFeedback('scanning');
    } catch {
      if (!isMountedRef.current || startTokenRef.current !== currentToken) {
        await stopScanner();
        return;
      }

      setCameraReady(false);
      setCameraFeedback('camera-error');
      setError('No se pudo iniciar la camara. Revisa permisos del navegador.');
      await stopScanner();
    } finally {
      isStartingRef.current = false;
    }
  }, [handleBarcodeScan, stopScanner]);

  useEffect(() => {
    if (mode !== 'camera') {
      setCameraFeedback('idle');
      void stopScanner();
      return;
    }

    const t = setTimeout(() => {
      void startScanner();
    }, 80);

    return () => {
      clearTimeout(t);
      void stopScanner();
    };
  }, [mode, startScanner, stopScanner]);

  // Reset lastBarcode after a delay to allow re-scanning same code
  useEffect(() => {
    if (lastBarcode) {
      const t = setTimeout(() => setLastBarcode(null), 3000);
      return () => clearTimeout(t);
    }
  }, [lastBarcode]);



  // Auto-focus barcode input in manual mode
  useEffect(() => {
    if (mode === 'manual') {
      barcodeInputRef.current?.focus();
    }
  }, [mode]);

  // Close search dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Clear messages after delay
  useEffect(() => {
    if (successMsg) {
      const t = setTimeout(() => setSuccessMsg(null), 2500);
      return () => clearTimeout(t);
    }
  }, [successMsg]);

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(t);
    }
  }, [error]);

  /** Handle manual barcode submit (Enter key or button) */
  const handleBarcodeSubmit = useCallback(() => {
    handleBarcodeScan(barcodeValue);
  }, [barcodeValue, handleBarcodeScan]);

  const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBarcodeSubmit();
    }
  };

  /** Debounced product name search */
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (!value.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const results = await posApi.searchProducts(value);
        setSearchResults(results);
        setShowResults(results.length > 0);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  };

  /** Select product from name search dropdown */
  const handleSelectProduct = (product: Product) => {

    addToCart(product, 1);
    setSuccessMsg(`+ ${product.name}`);
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
    barcodeInputRef.current?.focus();
  };



  return (
    <div className="space-y-4">
      {/* Mode Toggle */}
      <div className="flex p-1 bg-gray-100 rounded-xl mb-4">
        <button
          onClick={() => setMode('camera')}
          className={`flex-1 py-2.5 px-4 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
            mode === 'camera'
              ? 'bg-white text-green-700 shadow-sm border border-gray-200'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50 transparent'
          }`}
        >
          <Camera className="w-4 h-4" /> Camara
        </button>
        <button
          onClick={() => setMode('manual')}
          className={`flex-1 py-2.5 px-4 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
            mode === 'manual'
              ? 'bg-white text-green-700 shadow-sm border border-gray-200'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50 transparent'
          }`}
        >
          <Keyboard className="w-4 h-4" /> Manual
        </button>
      </div>

      {/* Camera Scanner */}
      {mode === 'camera' && (
        <div className="space-y-3">
          <CameraErrorBoundary>
            <div className="relative rounded-xl overflow-hidden border border-[var(--border-default)] bg-black h-80 sm:h-96">
              {/* Minimal wrapper needed for html5-qrcode. Must be block and fill parent */}
              <div id="reader" className="w-full h-full" style={{ width: '100%', height: '100%' }}></div>
              
              {/* Loading camera */}
              {!cameraReady && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10">
                  <div className="animate-spin rounded-full h-10 w-10 border-4 border-[var(--primary-base)] border-t-transparent mb-4" />
                  <p className="text-sm font-medium text-white tracking-wide">Iniciando camara...</p>
                </div>
              )}
            </div>
          </CameraErrorBoundary>

          <p className="text-xs text-[var(--text-muted)] text-center mt-2">
            Apunta la camara al codigo de barras del producto.
          </p>

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
              {cameraFeedback === 'starting' && 'Iniciando camara...'}
              {cameraFeedback === 'scanning' && 'Escaneando codigo de barras...'}
              {cameraFeedback === 'product-added' && 'Producto agregado al carrito.'}
              {cameraFeedback === 'not-found' && 'Producto no encontrado.'}
              {cameraFeedback === 'camera-error' && 'Error de camara. Verifica permisos e intenta de nuevo.'}
            </div>
          )}
        </div>
      )}

      {/* Manual Barcode Input */}
      {mode === 'manual' && (
        <div>
          <label htmlFor="barcode-input" className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
            Codigo de barras
          </label>
          <div className="flex gap-2">
            <input
              ref={barcodeInputRef}
              id="barcode-input"
              type="text"
              value={barcodeValue}
              onChange={(e) => setBarcodeValue(e.target.value)}
              onKeyDown={handleBarcodeKeyDown}
              placeholder="Escanea o escribe el codigo de barras..."
              autoComplete="off"
              className="flex-1 px-4 py-3 text-base rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-[var(--primary-base)]"
              disabled={loading}
            />
            <button
              onClick={handleBarcodeSubmit}
              disabled={loading || !barcodeValue.trim()}
              className="btn-primary px-5 py-3 text-base whitespace-nowrap"
            >
              {loading ? 'Buscando...' : 'Agregar'}
            </button>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Los escaneres USB envian el codigo automaticamente. Presiona Enter para buscar manualmente.
          </p>
        </div>
      )}

      {/* Product Name Search — available in both modes */}
      <div className="relative" ref={dropdownRef}>
        <label htmlFor="product-search" className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
          Buscar producto por nombre
        </label>
        <input
          ref={searchInputRef}
          id="product-search"
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          onFocus={() => {
            if (searchResults.length > 0) setShowResults(true);
          }}
          placeholder="Escribe el nombre del producto..."
          autoComplete="off"
          className="w-full px-4 py-3 text-base rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-[var(--primary-base)]"
        />
        {searchLoading && (
          <div className="absolute right-3 top-[42px] text-[var(--text-muted)]">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        )}

        {/* Search Results Dropdown */}
        {showResults && searchResults.length > 0 && (
          <div className="absolute z-50 w-full mt-1 max-h-64 overflow-y-auto rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] shadow-lg">
            {searchResults.map((product) => (
              <button
                key={product.id}
                onClick={() => handleSelectProduct(product)}
                className="w-full text-left px-4 py-3 hover:bg-[var(--surface-secondary)] transition-colors border-b border-[var(--border-light)] last:border-b-0"
              >
                <div className="flex justify-between items-start">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-[var(--text-primary)] truncate">
                      {product.name}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      SKU: {product.sku} | Cod: {product.barcode} | {product.categoryName}
                    </p>
                  </div>
                  <span className="ml-3 text-sm font-semibold text-[var(--primary-base)] whitespace-nowrap">
                    $ {parseFloat(product.salePrice).toFixed(2)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Success Message */}
      {successMsg && (
        <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm font-medium animate-pulse">
          {successMsg}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-400 hover:text-red-600 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
