import apiClient from './client';
import type { PageResponse } from '../types';

export type AuditAction = 'CONFIRM' | 'VOID' | 'RECEIVE' | 'ADJUST';
export type AuditEntity = 'SALE' | 'PURCHASE_ORDER' | 'INVENTORY';

export interface AuditRecord {
  id: number;
  action: AuditAction;
  entityType: AuditEntity;
  entityId: number;
  previousData: string | null;
  newData: string | null;
  username: string;
  ipAddress: string | null;
  createdAt: string; // ISO Instant
}

export interface AuditFilters {
  page?: number;
  pageSize?: number;
  entityType?: AuditEntity;
  action?: AuditAction;
  startDate?: string; // ISO date
  endDate?: string; // ISO date
  entityId?: string;
}

/**
 * Get audit records with optional filters
 * GET /api/v1/audit
 */
export const auditApi = {
  getAuditRecords: async (filters: AuditFilters = {}) => {
    const params = {
      page: filters.page || 0,
      size: filters.pageSize || 20,
      ...(filters.entityType && { entityType: filters.entityType }),
      ...(filters.action && { action: filters.action }),
      ...(filters.startDate && { startDate: filters.startDate }),
      ...(filters.endDate && { endDate: filters.endDate }),
      ...(filters.entityId && { entityId: filters.entityId }),
    };

    const response = await apiClient.get<PageResponse<AuditRecord>>('/audit', { params });
    return response.data;
  },

  getAuditRecordDetail: async (auditId: number) => {
    const response = await apiClient.get<AuditRecord>(`/audit/${auditId}`);
    return response.data;
  },

  getEntityAudit: async (type: string, entityId: number) => {
    const response = await apiClient.get<AuditRecord[]>(`/audit/entity/${type}/${entityId}`);
    return response.data;
  }
};

/**
 * Export audit trail as CSV
 * NOTE: Backend does not have a /audit/export endpoint.
 * This is a client-side stub that will fail if called.
 * TODO: Implement CSV export on backend or remove this.
 */

