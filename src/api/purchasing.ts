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
export const purchasingApi = {
  getSuppliers: async () => {
    const response = await apiClient.get<Supplier[]>('/suppliers');
    return response.data;
  },

  createSupplier: async (data: CreateSupplierRequest) => {
    const response = await apiClient.post<Supplier>('/suppliers', data);
    return response.data;
  },

  updateSupplier: async (id: number, data: Partial<CreateSupplierRequest>) => {
    const response = await apiClient.put<Supplier>(`/suppliers/${id}`, data);
    return response.data;
  },

  deleteSupplier: async (id: number) => {
    const response = await apiClient.delete(`/suppliers/${id}`);
    return response.data;
  },

  createPurchaseOrder: async (data: CreatePORequest): Promise<PurchaseOrder> => {
    let createResponse: { data: PurchaseOrder };

    // Step 1: Create the PO (without items  Ebackend DTO doesn't accept items)
    try {
      createResponse = await apiClient.post<PurchaseOrder>('/purchase-orders', {
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
        const itemResponse = await apiClient.post<PurchaseOrder>(
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
  },

  getPurchaseOrders: async (supplierId?: number) => {
    const params = supplierId ? { supplierId } : undefined;
    const response = await apiClient.get<PurchaseOrder[]>('/purchase-orders', { params });
    return response.data;
  },

  getPurchaseOrderById: async (orderId: number) => {
    const response = await apiClient.get<PurchaseOrder>(`/purchase-orders/${orderId}`);
    return response.data;
  },

  clonePurchaseOrder: async (orderId: number) => {
    const response = await apiClient.post<PurchaseOrder>(`/purchase-orders/${orderId}/clone`);
    return response.data;
  },

  markAsReceived: async (orderId: number, body?: { paymentMethod?: string; paymentDetails?: string; notes?: string }) => {
    const response = await apiClient.put<PurchaseOrder>(`/purchase-orders/${orderId}/receive`, body);
    return response.data;
  },

  voidPurchaseOrder: async (orderId: number) => {
    const response = await apiClient.put<PurchaseOrder>(`/purchase-orders/${orderId}/void`);
    return response.data;
  },

  removeOrderItem: async (orderId: number, detailId: number) => {
    const response = await apiClient.delete(`/purchase-orders/${orderId}/items/${detailId}`);
    return response.data;
  },

  getPurchaseOrderByNumber: async (orderNumber: string) => {
    const response = await apiClient.get<PurchaseOrder>(`/purchase-orders/number/${orderNumber}`);
    return response.data;
  },

  activateSupplier: async (id: number) => {
    const response = await apiClient.put<Supplier>(`/suppliers/${id}/activate`);
    return response.data;
  },

  deactivateSupplier: async (id: number) => {
    const response = await apiClient.put<Supplier>(`/suppliers/${id}/deactivate`);
    return response.data;
  },

  getSupplierByTaxId: async (taxId: string) => {
    const response = await apiClient.get<Supplier>(`/suppliers/tax-id/${taxId}`);
    return response.data;
  }
};

