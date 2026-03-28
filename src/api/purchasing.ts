import apiClient from './client';
import type { AxiosError } from 'axios';

export type POStatus = 'PENDING' | 'PARTIAL' | 'RECEIVED' | 'VOIDED';

export interface Supplier {
  id: number;
  name: string;
  taxId: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
}

export interface CreateSupplierRequest {
  name: string;
  taxId: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
}

export interface AuditInfo {
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

export interface PurchaseOrderDetail {
  id: number;
  productId: number;
  productName: string;
  requestedQuantity: number;
  receivedQuantity: number;
  unitCost: string; // BigDecimal as string
  subtotal: string;
  version: number;
  auditInfo: AuditInfo;
}

export interface PurchaseOrder {
  id: number;
  orderNumber: string;
  status: POStatus;
  supplierId: number;
  supplierName: string;
  total: string; // BigDecimal as string (4 decimal places)
  notes?: string;
  expectedDeliveryDate?: string;
  receiptImageUrl?: string;
  details: PurchaseOrderDetail[];
  version: number;
  auditInfo: AuditInfo;
}

/**
 * Backend CreatePurchaseOrderRequest only has supplierId, notes,
 * expectedDeliveryDate, receiptImageUrl. Items must be added separately
 * via POST /purchase-orders/{id}/items after creation.
 */
export interface CreatePORequest {
  supplierId: number;
  notes?: string;
  // Backend expects OffsetDateTime (full date-time with offset)
  expectedDeliveryDate?: string;
  receiptImageUrl?: string;
  items: {
    productId: number;
    quantity: number;
    unitCost: string;
  }[];
}

export interface AddOrderItemRequest {
  productId: number;
  requestedQuantity: number;
  unitCost: string;
}

export type PurchaseOrderCreationStage = 'create-order' | 'add-item';

export class PurchaseOrderCreationError extends Error {
  stage: PurchaseOrderCreationStage;
  itemIndex?: number;

  constructor(message: string, stage: PurchaseOrderCreationStage, itemIndex?: number) {
    super(message);
    this.name = 'PurchaseOrderCreationError';
    this.stage = stage;
    this.itemIndex = itemIndex;
  }
}

export interface PurchaseOrderResponse extends PurchaseOrder {}

const getErrorMessage = (error: unknown, fallback: string): string => {
  const axiosError = error as AxiosError<{ message?: string; error?: string }>;
  return (
    axiosError.response?.data?.message ||
    axiosError.response?.data?.error ||
    axiosError.message ||
    fallback
  );
};

/**
 * Get list of suppliers
 * GET /api/v1/suppliers
 */
export const getSuppliers = () => {
  return apiClient.get<Supplier[]>('/suppliers');
};

/**
 * Create a new supplier
 * POST /api/v1/suppliers
 */
export const createSupplier = (data: CreateSupplierRequest) => {
  return apiClient.post<Supplier>('/suppliers', data);
};

/**
 * Update a supplier
 * PUT /api/v1/suppliers/{id}
 */
export const updateSupplier = (id: number, data: Partial<CreateSupplierRequest>) => {
  return apiClient.put<Supplier>(`/suppliers/${id}`, data);
};

/**
 * Delete a supplier (soft delete in backend)
 * DELETE /api/v1/suppliers/{id}
 */
export const deleteSupplier = (id: number) => {
  return apiClient.delete(`/suppliers/${id}`);
};

/**
 * Create a new purchase order with items.
 * Backend flow: POST /purchase-orders (create PO), then POST /purchase-orders/{id}/items for each item.
 * This function handles the multi-step creation transparently.
 * POST /api/v1/purchase-orders
 */
export const createPurchaseOrder = async (data: CreatePORequest): Promise<PurchaseOrderResponse> => {
  let createResponse: { data: PurchaseOrderResponse };

  // Step 1: Create the PO (without items — backend DTO doesn't accept items)
  try {
    createResponse = await apiClient.post<PurchaseOrderResponse>('/purchase-orders', {
      supplierId: data.supplierId,
      notes: data.notes,
      expectedDeliveryDate: data.expectedDeliveryDate,
      receiptImageUrl: data.receiptImageUrl,
    });
  } catch (error) {
    throw new PurchaseOrderCreationError(
      getErrorMessage(error, 'No se pudo crear la orden de compra.'),
      'create-order'
    );
  }

  const orderId = createResponse.data.id;

  // Step 2: Add each item
  let latestOrder = createResponse.data;
  for (let index = 0; index < data.items.length; index += 1) {
    const item = data.items[index];
    try {
      const itemResponse = await apiClient.post<PurchaseOrderResponse>(
        `/purchase-orders/${orderId}/items`,
        {
          productId: item.productId,
          requestedQuantity: item.quantity,
          unitCost: item.unitCost,
        } as AddOrderItemRequest
      );
      latestOrder = itemResponse.data;
    } catch (error) {
      throw new PurchaseOrderCreationError(
        getErrorMessage(error, 'No se pudo agregar un item a la orden de compra.'),
        'add-item',
        index
      );
    }
  }

  return latestOrder;
};

/**
 * Get all purchase orders (backend returns List, not Page).
 * GET /api/v1/purchase-orders
 */
export const getPurchaseOrders = (supplierId?: number) => {
  const params = supplierId ? { supplierId } : undefined;
  return apiClient.get<PurchaseOrder[]>('/purchase-orders', { params });
};

/**
 * Get specific purchase order by ID
 * GET /api/v1/purchase-orders/{orderId}
 */
export const getPurchaseOrderById = (orderId: number) => {
  return apiClient.get<PurchaseOrder>(`/purchase-orders/${orderId}`);
};

/**
 * Clone a purchase order (Prototype Pattern)
 * POST /api/v1/purchase-orders/{orderId}/clone
 */
export const clonePurchaseOrder = (orderId: number) => {
  return apiClient.post<PurchaseOrder>(`/purchase-orders/${orderId}/clone`);
};

/**
 * Mark entire purchase order as received.
 * Backend accepts no request body — marks the whole order at once.
 * PUT /api/v1/purchase-orders/{orderId}/receive
 */
export const markAsReceived = (orderId: number) => {
  return apiClient.put<PurchaseOrder>(`/purchase-orders/${orderId}/receive`);
};

/**
 * Void/cancel a purchase order.
 * Backend accepts no request body.
 * PUT /api/v1/purchase-orders/{orderId}/void
 */
export const voidPurchaseOrder = (orderId: number) => {
  return apiClient.put<PurchaseOrder>(`/purchase-orders/${orderId}/void`);
};
