import { create } from 'zustand';
import type { Alert } from '../api/inventory';

interface AlertStoreState {
  activeAlerts: Alert[];
  unreadCount: number;
  setActiveAlerts: (alerts: Alert[]) => void;
  setUnreadCount: (count: number) => void;
  addAlert: (alert: Alert) => void;
  markAsReadLocal: (alertId: number) => void;
  resolveAlertLocal: (alertId: number) => void;
  clearAll: () => void;
}

export const useAlertStore = create<AlertStoreState>((set) => ({
  activeAlerts: [],
  unreadCount: 0,

  setActiveAlerts: (alerts) => {
    set({ activeAlerts: alerts });
  },

  setUnreadCount: (count) => {
    set({ unreadCount: Math.max(0, count) });
  },

  addAlert: (alert) => {
    set((state) => {
      const exists = state.activeAlerts.some((item) => item.id === alert.id);
      if (exists) {
        return {
          activeAlerts: state.activeAlerts.map((item) =>
            item.id === alert.id ? alert : item
          ),
        };
      }

      return {
        activeAlerts: [alert, ...state.activeAlerts],
      };
    });
  },

  markAsReadLocal: (alertId) => {
    set((state) => {
      const activeAlerts = state.activeAlerts.map((a) =>
        a.id === alertId ? { ...a, read: true } : a
      );

      const wasUnread = state.activeAlerts.some((a) => a.id === alertId && !a.read);
      return {
        activeAlerts,
        unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
      };
    });
  },

  resolveAlertLocal: (alertId) => {
    set((state) => {
      const removed = state.activeAlerts.find((a) => a.id === alertId);
      const activeAlerts = state.activeAlerts.filter((a) => a.id !== alertId);
      const shouldDecreaseUnread = removed ? !removed.read : false;

      return {
        activeAlerts,
        unreadCount: shouldDecreaseUnread
          ? Math.max(0, state.unreadCount - 1)
          : state.unreadCount,
      };
    });
  },

  clearAll: () => {
    set({ activeAlerts: [], unreadCount: 0 });
  },
}));
