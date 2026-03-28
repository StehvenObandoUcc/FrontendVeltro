import apiClient from './client';

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
 * Product as returned by GET /products and GET /products/barcode/{barcode}.
 * Matches the real backend ProductResponse — flat shape, salePrice field.
 */
export interface Product {
  id: number;
  name: string;
  sku: string;
  barcode: string;
  description?: string;
  costPrice: string;
  salePrice: string;
  categoryId: number;
  categoryName: string;
  active: boolean;
  minStockInfo: number;
  minStockWarning: number;
  minStockCritical: number;
  currentStock?: number;
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
export const getProductByBarcode = (barcode: string) => {
  return apiClient.get<Product>(`/products/barcode/${barcode}`);
};

/**
 * Search products — passes query to GET /products with search param.
 * Falls back to client-side filtering if backend doesn't support search param.
 */
export const searchProducts = async (query: string): Promise<Product[]> => {
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
};

/**
 * Confirm a sale (quick sale: start + items + confirm in one shot)
 * POST /api/v1/sales/quick
 */
export const confirmSale = (saleData: CreateSaleRequest) => {
  return apiClient.post<SaleResponse>('/sales/quick', saleData);
};

/**
 * Void a completed sale
 * POST /api/v1/sales/{saleId}/void
 */
export const voidSale = (saleId: number, reason?: string) => {
  return apiClient.post<SaleResponse>(`/sales/${saleId}/void`, { reason });
};

/**
 * AI-powered product identification via camera frame capture.
 * POST /api/v1/scanner/ai  (multipart/form-data with "image" field)
 *
 * @param imageBlob - Blob from canvas.toBlob() or captured frame
 * @param filename - filename for the image (e.g. "ai-scan-12345.jpg")
 */
export const aiScanProduct = (imageBlob: Blob, filename: string) => {
  const formData = new FormData();
  formData.append('image', imageBlob, filename);
  // Do NOT set Content-Type manually — Axios auto-detects FormData and sets
  // the correct multipart/form-data boundary. Setting it manually strips the boundary.
  return apiClient.post<ProductSuggestionResponse>('/scanner/ai', formData, {
    headers: {
      'Content-Type': undefined,
    },
    timeout: 60000, // 60s for AI processing
  });
};

/**
 * AI Fast Detection via CLIP vector search.
 * POST /api/v1/scanner/detect
 */
export const aiDetectFrame = (imageBlob: Blob, filename: string) => {
  const formData = new FormData();
  formData.append('image', imageBlob, filename);
  return apiClient.post<any>('/scanner/detect', formData, {
    headers: {
      'Content-Type': undefined,
    },
    timeout: 15000,
  });
};



/**
 * Check AI scanner availability
 * GET /api/v1/scanner/ai/available
 */
export const checkAiAvailable = () => {
  return apiClient.get<{ available: boolean }>('/scanner/ai/available');
};
