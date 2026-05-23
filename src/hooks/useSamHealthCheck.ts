import { useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';
import { useAiScanStore } from '../stores/aiScanStore';

const POLLING_INTERVAL_MS = 60_000;

type SamStatusResponse = {
  samAvailable?: boolean;
  available?: boolean;
};

/**
 * Polls the backend SAM health-check endpoint at a fixed interval
 * and keeps `segmentationAvailable` in sync with the real service state.
 *
 * - Runs immediately on mount, then every {@link POLLING_INTERVAL_MS}.
 * - On any network/parse error the status falls back to `false`.
 */
export const useSamHealthCheck = () => {
  const setSegmentationAvailable = useAiScanStore((s) => s.setSegmentationAvailable);

  const fetchStatus = useCallback(async (signal: AbortSignal) => {
    try {
      const response = await apiClient.get<SamStatusResponse>('/scanner/sam-status', { signal });
      const data = response.data;
      const available = Boolean(data?.samAvailable ?? data?.available);
      setSegmentationAvailable(available);
    } catch {
      if (!signal.aborted) {
        setSegmentationAvailable(false);
      }
    }
  }, [setSegmentationAvailable]);

  useEffect(() => {
    const controller = new AbortController();

    void fetchStatus(controller.signal);

    const intervalId = setInterval(() => {
      void fetchStatus(controller.signal);
    }, POLLING_INTERVAL_MS);

    return () => {
      controller.abort();
      clearInterval(intervalId);
    };
  }, [fetchStatus]);
};
