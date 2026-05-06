import apiClient from './client';
import type { PageResponse } from '../types';

export type { PageResponse };

export interface DashboardResponse {
  todaySales: string; // BigDecimal as string
  todaySalesCount: number;
  averageTicket: string; // BigDecimal as string
  outOfStockProducts: number;
  outOfStockProductList: OutOfStockProductRow[];
  estimatedMonthlyProfit: string; // BigDecimal as string
  lowStockAlertCount: number;
  recentSales: SaleRow[];
}

export interface OutOfStockProductRow {
  productName: string;
}

export interface SaleRow {
  saleId: number;
  saleNumber: string;
  total: number | string;
  itemCount: number;
  cashierId: number;
  completedAt: string;
}

/**
 * Get dashboard data
 * GET /api/v1/dashboard
 */
export const dashboardApi = {
  getDashboard: async () => {
    const response = await apiClient.get<DashboardResponse>('/dashboard');
    return response.data;
  },

  exportReport: async (format: 'PDF' | 'EXCEL') => {
    const end = new Date();
    const start = new Date();
    start.setDate(1); // First day of current month
    
    const startDateStr = start.toISOString().split('T')[0];
    const endDateStr = end.toISOString().split('T')[0];

    const response = await apiClient.get<Blob>(
      `/reports/export/${format}?startDate=${startDateStr}&endDate=${endDateStr}`,
      {
        responseType: 'blob',
      }
    );
    return response.data;
  },

  exportProfitabilityReportPdf: function() {
    return this.exportReport('PDF');
  },

  exportProfitabilityReportExcel: function() {
    return this.exportReport('EXCEL');
  },

  getProfitabilityReport: async (startDate: string, endDate: string) => {
    const response = await apiClient.get(`/reports/profitability`, {
      params: { startDate, endDate }
    });
    return response.data;
  }
};

