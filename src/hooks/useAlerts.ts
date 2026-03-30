import { useEffect, useRef } from 'react';
import { useAlertStore } from '../stores/alertStore';
import { useAuthStore } from '../stores/authStore';
import { getAlerts, getUnreadAlertCount, type Alert } from '../api/inventory';

export const useAlerts = (pollInterval: number = 30000) => {
  const { setActiveAlerts, setUnreadCount, addAlert } = useAlertStore();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previousCountRef = useRef<number>(0);

  useEffect(() => {
    // Don't poll if user is not authenticated
    if (!isAuthenticated) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    const fetchAlerts = async () => {
      try {
        const [alertsResponse, unreadResponse] = await Promise.all([
          getAlerts(0),
          getUnreadAlertCount(),
        ]);

        const currentAlerts = alertsResponse.data.content.filter((a: Alert) => !a.resolved);
        const unreadCount = unreadResponse.data.count;

        // Check if new critical alert appeared
        const criticalCount = currentAlerts.filter(
          (a: Alert) => a.severity === 'CRITICAL' && !a.read
        ).length;

        if (criticalCount > 0 && unreadCount > previousCountRef.current) {
          const newAlerts = currentAlerts.filter(
            (a: Alert) => a.severity === 'CRITICAL' && !a.read
          );
          newAlerts.forEach((alert: Alert) => {
            console.log('Critical Alert:', alert.message);
          });
        }

        previousCountRef.current = unreadCount;
        setActiveAlerts(currentAlerts);
        setUnreadCount(unreadCount);
      } catch (error) {
        console.error('Error fetching alerts:', error);
      }
    };

    // Initial fetch
    fetchAlerts();

    // Set up polling
    pollingIntervalRef.current = setInterval(fetchAlerts, pollInterval);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [pollInterval, setActiveAlerts, setUnreadCount, isAuthenticated]);

  return { addAlert };
};
