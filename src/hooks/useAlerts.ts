import { useCallback, useEffect, useRef } from 'react';
import axios from 'axios';
import { inventoryApi } from '../api/inventory';
import { useAlertStore } from '../stores/alertStore';
import { useAuthStore } from '../stores/authStore';

const POLL_INTERVAL_MS = 30_000;

export const useAlerts = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const setUnreadCount = useAlertStore((state) => state.setUnreadCount);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);

  const fetchUnreadCount = useCallback(async (): Promise<boolean> => {
    if (cancelledRef.current) {
      return false;
    }

    try {
      const { count } = await inventoryApi.getUnreadAlertCount();
      if (!cancelledRef.current) {
        setUnreadCount(count);
      }
      return false;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 401 || status === 403) {
          cancelledRef.current = true;
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          return true;
        }
      }
      return false;
    }
  }, [setUnreadCount]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    cancelledRef.current = false;

    const scheduleNext = () => {
      if (cancelledRef.current) {
        return;
      }

      timeoutRef.current = setTimeout(() => {
        void runPollCycle();
      }, POLL_INTERVAL_MS);
    };
    const runPollCycle = async () => {
      if (cancelledRef.current) {
        return;
      }
      if (document.visibilityState === 'visible') {
        const shouldStop = await fetchUnreadCount();
        if (shouldStop) {
          return;
        }
      }
      scheduleNext();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !cancelledRef.current) {
        void fetchUnreadCount();
      }
    };

    void (async () => {
      await fetchUnreadCount();
      scheduleNext();
    })();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelledRef.current = true;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated, fetchUnreadCount]);
};
