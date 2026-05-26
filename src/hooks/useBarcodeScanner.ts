import { useCallback, useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

export type CameraFeedbackState =
  | 'idle'
  | 'starting'
  | 'scanning'
  | 'product-added'
  | 'not-found'
  | 'camera-error';

const CAMERA_START_CONFIG = {};
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
    facingMode: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
      ? { exact: 'environment' } 
      : 'environment',
  },
};

interface UseBarcodeScannerOptions {
  readerId: string;
  onDecode: (barcode: string) => Promise<void> | void;
  enabled?: boolean;
  startDelayMs?: number;
  dedupeMs?: number;
  stopOnDecode?: boolean;
  startErrorMessage?: string;
}

export function useBarcodeScanner({
  readerId,
  onDecode,
  enabled = true,
  startDelayMs = 80,
  dedupeMs = 3000,
  stopOnDecode = false,
  startErrorMessage = 'No se pudo iniciar la cámara. Verifica permisos del navegador.',
}: UseBarcodeScannerOptions) {
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraFeedback, setCameraFeedback] = useState<CameraFeedbackState>('idle');
  const [lastBarcode, setLastBarcode] = useState<string | null>(null);
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
        await currentScanner.stop();
      } catch {
        // noop
      }

      // FALLBACK: ensure camera hardware light turns off if html5-qrcode leaked it
      try {
        const readerEl = document.getElementById(readerId);
        if (readerEl) {
          const videoEls = readerEl.getElementsByTagName('video');
          for (let i = 0; i < videoEls.length; i++) {
            const stream = videoEls[i].srcObject as MediaStream;
            if (stream && stream.getTracks) {
              stream.getTracks().forEach(track => track.stop());
              videoEls[i].srcObject = null;
            }
          }
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
  }, [readerId]);

  const startScanner = useCallback(async () => {
    const readerEl = document.getElementById(readerId);
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

    const qrCodeSuccessCallback = async (decodedText: string) => {
      const now = Date.now();
      const isNewCode =
        decodedText &&
        (decodedText !== lastScannedCodeRef.current ||
          now - lastScannedTimeRef.current > dedupeMs);

      if (!isNewCode || isHandlingScanRef.current) return;

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
      const isPortrait = window.innerHeight > window.innerWidth;
      await scanner.start(
        CAMERA_START_CONFIG,
        {
          ...BARCODE_SCANNER_CONFIG,
          videoConstraints: {
            width: { ideal: isPortrait ? 720 : 1280 },
            height: { ideal: isPortrait ? 1280 : 720 },
            facingMode: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
              ? { exact: 'environment' } 
              : 'environment',
          },
        },
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
      setCameraFeedback('scanning');
    } catch {
      if (!isMountedRef.current || startTokenRef.current !== currentToken) {
        await stopScanner();
        return;
      }

      setCameraReady(false);
      setCameraFeedback('camera-error');
      setError(startErrorMessage);
      await stopScanner();
    } finally {
      isStartingRef.current = false;
    }
  }, [dedupeMs, onDecode, readerId, startErrorMessage, stopOnDecode, stopScanner]);

  useEffect(() => {
    if (!enabled) {
      setCameraFeedback('idle');
      void stopScanner();
      return;
    }

    const t = setTimeout(() => {
      void startScanner();
    }, startDelayMs);

    return () => {
      clearTimeout(t);
      void stopScanner();
    };
  }, [enabled, startDelayMs, startScanner, stopScanner]);

  useEffect(() => {
    if (lastBarcode) {
      const t = setTimeout(() => setLastBarcode(null), dedupeMs);
      return () => clearTimeout(t);
    }
  }, [dedupeMs, lastBarcode]);

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(t);
    }
  }, [error]);

  return {
    cameraReady,
    cameraFeedback,
    lastBarcode,
    error,
    setError,
    setCameraFeedback,
    setTransientFeedback,
    startScanner,
    stopScanner,
  };
}
