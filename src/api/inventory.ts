import apiClient from './client';
import type { PageResponse } from '../types';

export type { PageResponse };

export type AlertSeverity = 'CRITICAL' | 'WARNING' | 'INFO';
export type AlertType = 'OUT_OF_STOCK' | 'LOW_STOCK' | 'OVERSTOCK';

export interface Alert {
  id: number;
  productId: number;
  productName: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  read: boolean;
  resolved: boolean;
  createdAt: string;
}

export interface UnreadAlertCountResponse {
  count: number;
}

export interface AlertConfig {
  productId: string;
  criticalStock: number;
  minStock: number;
  overstockThreshold: number;
}

export interface InventoryItem {
  id: number;
  productId: number;
  productName: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  active: boolean;
  version: number;
}

export interface InventoryMovement {
  id: number;
  inventoryId: number;
  movementType: 'ENTRY' | 'EXIT' | 'ADJUSTMENT' | 'SALE';
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  createdAt: string;
  createdBy: string;
}

export interface StockEntryRequest {
  quantity: number;
  reason: string;
}

export interface StockExitRequest {
  quantity: number;
  reason: string;
}

export interface StockAdjustmentRequest {
  newStock: number;
  reason: string;
}

export interface UpdateStockLimitsRequest {
  minStock: number;
  maxStock: number;
}

/**
 * Get all inventory items with pagination
 * GET /api/v1/inventory
 */
export const inventoryApi = {
  getInventory: async (page: number = 0, size: number = 20, search?: string) => {
    const response = await apiClient.get<PageResponse<InventoryItem>>('/inventory', {
      params: { page, size, search: search || undefined },
    });
    return response.data;
  },

/**
 * Get inventory for a specific product
 * GET /api/v1/inventory/{productId}
 */
  getInventoryByProductId: async (productId: number) => {
    const response = await apiClient.get<InventoryItem>(`/inventory/${productId}`);
    return response.data;
  },

/**
 * Get movement history for a product
 * GET /api/v1/inventory/{productId}/movements
 */
  getInventoryMovements: async (productId: number, page: number = 0) => {
    const response = await apiClient.get<PageResponse<InventoryMovement>>(`/inventory/${productId}/movements`, {
      params: { page, size: 20 },
    });
    return response.data;
  },

/**
 * Record stock entry
 * POST /api/v1/inventory/{productId}/entry
 */
  recordStockEntry: async (productId: number, data: StockEntryRequest) => {
    const response = await apiClient.post<InventoryItem>(`/inventory/${productId}/entry`, data);
    return response.data;
  },

/**
 * Record stock exit
 * POST /api/v1/inventory/{productId}/exit
 */
  recordStockExit: async (productId: number, data: StockExitRequest) => {
    const response = await apiClient.post<InventoryItem>(`/inventory/${productId}/exit`, data);
    return response.data;
  },

/**
 * Record stock adjustment
 * POST /api/v1/inventory/{productId}/adjustment
 */
  recordStockAdjustment: async (productId: number, data: StockAdjustmentRequest) => {
    const response = await apiClient.post<InventoryItem>(`/inventory/${productId}/adjustment`, data);
    return response.data;
  },

/**
 * Update stock limits
 * PUT /api/v1/inventory/{productId}/limits
 */
  updateStockLimits: async (productId: number, data: UpdateStockLimitsRequest) => {
    const response = await apiClient.put<InventoryItem>(`/inventory/${productId}/limits`, data);
    return response.data;
  },

/**
 * Get paginated list of alerts
 * GET /api/v1/alerts
 * Backend returns Spring Page<AlertResponse>
 */
  getAlerts: async (page: number = 0, severity?: string) => {
    const response = await apiClient.get<PageResponse<Alert>>('/alerts', {
      params: {
        page,
        size: 10,
        severity: severity || undefined,
      },
    });
    return response.data;
  },

/**
 * Mark alert as read
 * PUT /api/v1/alerts/{alertId}/read
 */
  markAlertAsRead: async (alertId: number) => {
    const response = await apiClient.put<Alert>(`/alerts/${alertId}/read`);
    return response.data;
  },

/**
 * Resolve an alert
 * PUT /api/v1/alerts/{alertId}/resolve
 */
  resolveAlert: async (alertId: number) => {
    const response = await apiClient.put<Alert>(`/alerts/${alertId}/resolve`);
    return response.data;
  },

/**
 * Backward-compatible alias for resolve
 */
  dismissAlert: function(alertId: number) {
    return this.resolveAlert(alertId);
  },

/**
 * Get unread alerts count
 * GET /api/v1/alerts/unread/count
 */
  getUnreadAlertCount: async () => {
    const response = await apiClient.get<UnreadAlertCountResponse>('/alerts/unread/count');
    return response.data;
  },

/**
 * Get alert configuration for a product
 * GET /api/v1/alerts/configuration/{productId}
 */
  getAlertConfig: async (productId: number) => {
    const response = await apiClient.get<AlertConfig>(
      `/alerts/configuration/${productId}`
    );
    return response.data;
  },

/**
 * Update alert configuration for a product
 * PUT /api/v1/alerts/configuration/{productId}
 */
  updateAlertConfig: async (productId: number, config: Omit<AlertConfig, 'productId'>) => {
    const response = await apiClient.put<AlertConfig>(
      `/alerts/configuration/${productId}`,
      config
    );
    return response.data;
  }
};
