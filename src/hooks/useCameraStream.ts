import { useRef, useEffect, useState, useCallback } from 'react';

interface UseCameraStreamOptions {
  videoRef: React.RefObject<HTMLVideoElement>;
  onStop?: () => void;
}

export function useCameraStream({ videoRef, onStop }: UseCameraStreamOptions) {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraInitializing, setIsCameraInitializing] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraSessionIdRef = useRef(0);

  const onStopRef = useRef(onStop);
  useEffect(() => {
    onStopRef.current = onStop;
  }, [onStop]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setIsCameraInitializing(false);
    onStopRef.current?.();
  }, [videoRef]);

  const initCamera = useCallback(async (sessionId: number) => {
    try {
      setIsCameraInitializing(true);
      setCameraError(null);

      // Stop any existing tracks before requesting a new stream, to prevent resource leaks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      const isPortrait = window.innerHeight > window.innerWidth;
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: isPortrait ? 720 : 1280 },
          height: { ideal: isPortrait ? 1280 : 720 },
          facingMode: isMobile ? { exact: 'environment' } : 'environment',
        },
      });

      if (cameraSessionIdRef.current !== sessionId) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (error) {
          if (
            (error instanceof DOMException && error.name === 'AbortError') ||
            cameraSessionIdRef.current !== sessionId
          ) {
            return;
          }
          throw error;
        }

        if (cameraSessionIdRef.current !== sessionId) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        setCameraActive(true);
      }
    } catch (error) {
      if (cameraSessionIdRef.current === sessionId) {
        if (error instanceof Error) {
          if (error.name === 'NotAllowedError') {
            setCameraError('Acceso a la cámara denegado por el navegador.');
          } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            setCameraError('No se encontró una cámara compatible en el dispositivo.');
          } else {
            setCameraError(`No se pudo inicializar el escáner: ${error.message}`);
          }
        } else {
          setCameraError('No se pudo inicializar el escáner.');
        }
      }
    } finally {
      if (cameraSessionIdRef.current === sessionId) {
        setIsCameraInitializing(false);
      }
    }
  }, [videoRef]);

  const restartCamera = useCallback(() => {
    const sessionId = ++cameraSessionIdRef.current;
    stopCamera();
    void initCamera(sessionId);
  }, [stopCamera, initCamera]);

  useEffect(() => {
    const sessionId = ++cameraSessionIdRef.current;
    void initCamera(sessionId);

    const handleOrientationChange = () => {
      restartCamera();
    };

    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      cameraSessionIdRef.current += 1;
      stopCamera();
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, [initCamera, restartCamera, stopCamera]);

  return {
    cameraActive,
    cameraError,
    isCameraInitializing,
    restartCamera,
    stopCamera,
  };
}
