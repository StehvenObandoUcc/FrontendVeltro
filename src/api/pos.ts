import apiClient from './client';
import type { Product } from '../types';

export interface CreateSaleRequest {
  items: {
    productId: number;
    quantity: number;
  }[];
  paymentMethod: 'CASH' | 'CARD' | 'NEQUI' | 'DAVIPLATA';
  amountReceived?: number;
  notes?: string;
}

export interface SaleResponse {
  id: number;
  saleNumber: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'VOIDED';
  cashierId: number;
  subtotal: string;
  total: string;
  amountReceived: string | null;
  change: string | null;
  paymentMethod: 'CASH' | 'CARD' | 'NEQUI' | 'DAVIPLATA' | 'YAPE' | 'PLIN' | null;
  completedAt: string | null;
  details: {
    id: number;
    productId: number;
    productName: string;
    quantity: number;
    unitPrice: string;
    subtotal: string;
  }[];
  version: number;
}



/**
 * AI suggestion from backend — matches ProductSuggestionResponse.SuggestedProduct
 * confidence is 0.0–1.0 (NOT 0–100)
 *
 * When AI matches a catalog product: productId/productName/barcode come from the DB match.
 * When AI identifies a NEW product (no catalog match): productId=null, barcode=null,
 * and the AI's raw suggestions are in suggestedName/suggestedBarcode/suggestedPrice.
 */
export interface SuggestedProduct {
  productId: number | null;
  productName: string;
  confidence: number;        // 0.0–1.0
  suggestedPrice: string | null;
  barcode: string | null;
  /** AI-suggested product name (always present, even when matched to catalog) */
  suggestedName: string | null;
  /** AI-suggested barcode (if visible in image; null if AI couldn't read it) */
  suggestedBarcode: string | null;
}

export interface ProductSuggestionResponse {
  suggestions: SuggestedProduct[];
  processingTimeMs: number;
  strategyUsed: string;
}

/**
 * Get product by barcode
 * GET /api/v1/products/barcode/{barcode}
 */
export const posApi = {
  getProductByBarcode: async (barcode: string) => {
    const response = await apiClient.get<Product>(`/products/barcode/${barcode}`);
    return response.data;
  },

/**
 * Search products — passes query to GET /products with search param.
 * Falls back to client-side filtering if backend doesn't support search param.
 */
  searchProducts: async (query: string): Promise<Product[]> => {
    const params: Record<string, string | number> = { page: 0, size: 100 };
    if (query.trim()) {
      params.search = query.trim();
    }
    const response = await apiClient.get<{
      content: Product[];
      totalElements: number;
    }>('/products', { params });
    const all = response.data.content;
    if (!query.trim()) return all.filter((p) => p.active);
    // Client-side fallback filter in case backend ignores search param
    const q = query.toLowerCase();
    return all.filter(
      (p) =>
        p.active &&
        (p.name.toLowerCase().includes(q) ||
          p.barcode?.toLowerCase().includes(q) ||
          p.sku?.toLowerCase().includes(q))
    );
  },

/**
 * Confirm a sale (quick sale: start + items + confirm in one shot)
 * POST /api/v1/sales/quick
 */
  confirmSale: async (saleData: CreateSaleRequest) => {
    const response = await apiClient.post<SaleResponse>('/sales/quick', saleData);
    return response.data;
  },

/**
 * Void a completed sale
 * POST /api/v1/sales/{saleId}/void
 */
  voidSale: async (saleId: number, reason?: string) => {
    const response = await apiClient.post<SaleResponse>(`/sales/${saleId}/void`, { reason });
    return response.data;
  },

/**
 * AI-powered product identification via camera frame capture.
 * POST /api/v1/scanner/ai  (multipart/form-data with "image" field)
 *
 * @param imageBlob - Blob from canvas.toBlob() or captured frame
 * @param filename - filename for the image (e.g. "ai-scan-12345.jpg")
 */
  aiScanProduct: async (imageBlob: Blob, filename: string) => {
    const formData = new FormData();
    formData.append('image', imageBlob, filename);
    // Do NOT set Content-Type manually — Axios auto-detects FormData and sets
    // the correct multipart/form-data boundary. Setting it manually strips the boundary.
    const response = await apiClient.post<ProductSuggestionResponse>('/scanner/ai', formData, {
      headers: {
        'Content-Type': undefined,
      },
      timeout: 60000, // 60s for AI processing
    });
    return response.data;
  },

  aiDetectFrame: async (imageBlob: Blob, filename: string) => {
    const formData = new FormData();
    formData.append('image', imageBlob, filename);
    const response = await apiClient.post<DetectSearchResponse[]>('/scanner/detect', formData, {
      headers: {
        'Content-Type': undefined,
      },
      timeout: 15000,
    });
    return response.data;
  },

  checkAiAvailable: async () => {
    const response = await apiClient.get<{ available: boolean }>('/scanner/ai/available');
    return response.data;
  }
};

export interface DetectMatch {
  id: number;
  name: string;
  salePrice: string;
  barcode: string | null;
  sku: string | null;
}

export interface DetectSearchResponse {
  matches: DetectMatch[];
}
