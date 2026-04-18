import { useCallback, useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

export type CameraFeedbackState =
  | 'idle'
  | 'starting'
  | 'scanning'
  | 'product-added'
  | 'not-found'
  | 'camera-error';

interface UseBarcodeScannerOptions {
  readerId: string;
  onDecode: (barcode: string) => Promise<void> | void;
  enabled?: boolean;
  startDelayMs?: number;
  stopOnDecode?: boolean;
}

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

export function useBarcodeScanner({
  readerId,
  onDecode,
  enabled = true,
  startDelayMs = 80,
  stopOnDecode = false,
}: UseBarcodeScannerOptions) {
  const [cameraReady, setCameraReady] = useState(false);
  const [lastBarcode, setLastBarcode] = useState<string | null>(null);
  const [cameraFeedback, setCameraFeedback] = useState<CameraFeedbackState>('idle');
  const [error, setError] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScannedTimeRef = useRef<number>(0);
  const lastScannedCodeRef = useRef<string | null>(null);
  const isMountedRef = useRef(false);
  const isStartingRef = useRef(false);
  const isStoppingRef = useRef(false);
  const stopPromiseRef = useRef<Promise<void> | null>(null);
  const startTokenRef = useRef(0);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  const setTransientFeedback = useCallback((value: CameraFeedbackState) => {
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }

    setCameraFeedback(value);
    if (value === 'product-added' || value === 'not-found') {
      feedbackTimerRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          setCameraFeedback('scanning');
        }
      }, 1600);
    }
  }, []);

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
    const readerElement = document.getElementById(readerId);
    if (!readerElement) return;
    if (isStartingRef.current || isStoppingRef.current || scannerRef.current) return;

    if (stopPromiseRef.current) {
      await stopPromiseRef.current;
    }

    isStartingRef.current = true;
    const currentToken = ++startTokenRef.current;

    setCameraReady(false);
    setCameraFeedback('starting');
    setError(null);
    readerElement.innerHTML = '';

    const scanner = new Html5Qrcode(readerId, {
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

    const onSuccess = async (decodedText: string) => {
      const now = Date.now();
      const isSameRecentCode =
        decodedText === lastScannedCodeRef.current && now - lastScannedTimeRef.current <= 3000;

      if (!decodedText || isSameRecentCode || isHandlingScanRef.current) return;

      isHandlingScanRef.current = true;
      lastScannedCodeRef.current = decodedText;
      lastScannedTimeRef.current = now;
      setLastBarcode(decodedText);

      try {
        if (stopOnDecode) {
          await stopScanner();
        }
        await onDecode(decodedText);
      } finally {
        isHandlingScanRef.current = false;
      }
    };

    try {
      await scanner.start(
        CAMERA_START_CONFIG,
        BARCODE_SCANNER_CONFIG,
        onSuccess,
        () => {
          // noop
        }
      );

      if (!isMountedRef.current || startTokenRef.current !== currentToken) {
        await stopScanner();
        return;
      }

      setCameraReady(true);
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
  }, [onDecode, readerId, stopOnDecode, stopScanner]);

  useEffect(() => {
    if (!enabled) {
      setCameraFeedback('idle');
      void stopScanner();
      return;
    }

    const timeoutId = setTimeout(() => {
      void startScanner();
    }, startDelayMs);

    return () => {
      clearTimeout(timeoutId);
      void stopScanner();
    };
  }, [enabled, startDelayMs, startScanner, stopScanner]);

  useEffect(() => {
    if (lastBarcode) {
      const timeoutId = setTimeout(() => setLastBarcode(null), 3000);
      return () => clearTimeout(timeoutId);
    }
  }, [lastBarcode]);

  useEffect(() => {
    if (error) {
      const timeoutId = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timeoutId);
    }
  }, [error]);

  return {
    cameraReady,
    cameraFeedback,
    lastBarcode,
    error,
    setError,
    startScanner,
    stopScanner,
    setTransientFeedback,
  };
}
