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
export const getDashboard = () => {
  return apiClient.get<DashboardResponse>('/dashboard');
};

/**
 * Export profitability report as PDF
 * GET /api/v1/reports/export/PDF
 */
export const exportProfitabilityReportPdf = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(1); // First day of current month
  
  const startDateStr = start.toISOString().split('T')[0];
  const endDateStr = end.toISOString().split('T')[0];

  return apiClient.get<Blob>(
    `/reports/export/PDF?startDate=${startDateStr}&endDate=${endDateStr}`,
    {
      responseType: 'blob',
    }
  );
};

/**
 * Export profitability report as Excel
 * GET /api/v1/reports/export/EXCEL
 */
export const exportProfitabilityReportExcel = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(1); // First day of current month
  
  const startDateStr = start.toISOString().split('T')[0];
  const endDateStr = end.toISOString().split('T')[0];

  return apiClient.get<Blob>(
    `/reports/export/EXCEL?startDate=${startDateStr}&endDate=${endDateStr}`,
    {
      responseType: 'blob',
    }
  );
};
