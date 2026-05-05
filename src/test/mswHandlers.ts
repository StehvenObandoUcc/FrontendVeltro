import { http, HttpResponse } from 'msw';

const API_BASE = 'http://localhost:8080/api/v1';

// Mock JWT tokens
const MOCK_ACCESS_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFkbWluIFVzZXIiLCJpYXQiOjE1MTYyMzkwMjIsInJvbGUiOiJBRE1JTiJ9.test';
const MOCK_REFRESH_TOKEN = 'refresh_token_test_1234567890';

// Mock data generators
export const generateMockUser = (role = 'ADMIN') => ({
  id: 1,
  username: 'admin',
  email: 'admin@veltro.com',
  role,
  active: true,
  createdAt: new Date().toISOString(),
});

export const generateMockProduct = (id = 1) => ({
  id,
  name: `Product ${id}`,
  barcode: `EAN-${String(id).padStart(8, '0')}`,
  sku: `SKU-${id}`,
  description: `Test product ${id}`,
  costPrice: 10.00,
  salePrice: 25.50,
  categoryId: 1,
  active: true,
  createdAt: new Date().toISOString(),
});

export const generateMockCategory = (id = 1) => ({
  id,
  name: `Category ${id}`,
  description: `Test category ${id}`,
  parentCategoryId: null,
  active: true,
  createdAt: new Date().toISOString(),
});

export const generateMockAlert = (id = 1) => ({
  id,
  productId: 1,
  type: 'OUT_OF_STOCK',
  severity: 'CRITICAL',
  message: 'Product out of stock',
  createdAt: new Date().toISOString(),
  resolved: false,
});

export const generateMockSale = (id = 1) => ({
  id,
  saleNumber: `SALE-${String(id).padStart(6, '0')}`,
  items: [
    {
      productId: 1,
      productName: 'Product 1',
      quantity: 2,
      unitPrice: 25.50,
      subtotal: 51.00,
    },
  ],
  total: 51.00,
  paymentMethod: 'CASH',
  status: 'COMPLETED',
  createdAt: new Date().toISOString(),
});

export const generateMockPurchaseOrder = (id = 1) => ({
  id,
  orderNumber: `PO-${String(id).padStart(6, '0')}`,
  supplierId: 1,
  items: [
    {
      id: `item-${id}`,
      productId: 1,
      productName: 'Product 1',
      quantity: 100,
      unitCost: 10.00,
      receivedQty: 0,
      subtotal: 1000.00,
    },
  ],
  status: 'PENDING',
  createdAt: new Date().toISOString(),
  totalCost: 1000.00,
});

// MSW Handlers
export const handlers = [
  // ========== AUTHENTICATION ==========
  http.post(`${API_BASE}/auth/login`, () => {
    return HttpResponse.json(
      {
        accessToken: MOCK_ACCESS_TOKEN,
        refreshToken: MOCK_REFRESH_TOKEN,
        tokenType: 'Bearer',
        expiresIn: 3600,
        username: 'admin',
        role: 'ADMIN',
        businessId: 1,
        id: 1,
        email: 'admin@veltro.com',
      },
      { status: 200 }
    );
  }),

  http.post(`${API_BASE}/auth/refresh`, () => {
    return HttpResponse.json(
      {
        accessToken: MOCK_ACCESS_TOKEN,
        refreshToken: MOCK_REFRESH_TOKEN,
        tokenType: 'Bearer',
        expiresIn: 3600,
        username: 'admin',
        role: 'ADMIN',
        businessId: 1,
        id: 1,
        email: 'admin@veltro.com',
      },
      { status: 200 }
    );
  }),

  http.post(`${API_BASE}/auth/register`, () => {
    return HttpResponse.json(
      { success: true, message: 'User registered successfully' },
      { status: 201 }
    );
  }),

  http.post(`${API_BASE}/auth/workers`, async ({ request }) => {
    const body = await request.json() as { username?: string; role?: string };
    return HttpResponse.json(
      {
        success: true,
        message: 'Worker created successfully',
        username: body.username ?? 'worker',
        role: body.role ?? 'CASHIER',
      },
      { status: 201 }
    );
  }),

  http.get(`${API_BASE}/auth/workers`, () => {
    return HttpResponse.json(
      [generateMockUser('CASHIER'), generateMockUser('WAREHOUSE')],
      { status: 200 }
    );
  }),

  http.delete(`${API_BASE}/auth/workers/:id`, () => {
    return HttpResponse.json(
      { success: true, message: 'Worker deleted successfully' },
      { status: 200 }
    );
  }),

  http.patch(`${API_BASE}/auth/workers/:id/role`, async ({ params, request }) => {
    const body = await request.json() as { role?: string };
    return HttpResponse.json(
      {
        ...generateMockUser('CASHIER'),
        id: Number(params.id),
        role: body.role ?? 'CASHIER',
      },
      { status: 200 }
    );
  }),

  http.post(`${API_BASE}/auth/logout`, () => {
    return HttpResponse.json({}, { status: 200 });
  }),

  http.put(`${API_BASE}/auth/change-password`, () => {
    return HttpResponse.json({}, { status: 200 });
  }),

  // ========== CATALOG ==========
  http.get(`${API_BASE}/products`, ({ request }) => {
    const url = new URL(request.url);
    const page = url.searchParams.get('page') || '0';
    return HttpResponse.json(
      {
        content: [generateMockProduct(1), generateMockProduct(2), generateMockProduct(3)],
        totalElements: 100,
        totalPages: 10,
        number: parseInt(page),
        pageSize: 10,
      },
      { status: 200 }
    );
  }),

  http.get(`${API_BASE}/products/barcode/:barcode`, ({ params }) => {
    if (params.barcode === 'EAN-00000001') {
      return HttpResponse.json(generateMockProduct(1), { status: 200 });
    }
    return HttpResponse.json(
      { error: 'Product not found' },
      { status: 404 }
    );
  }),

  http.post(`${API_BASE}/products`, async ({ request }) => {
    return HttpResponse.json(generateMockProduct(1), { status: 201 });
  }),

  http.put(`${API_BASE}/products/:id`, () => {
    return HttpResponse.json(generateMockProduct(1), { status: 200 });
  }),

  http.get(`${API_BASE}/categories`, () => {
    return HttpResponse.json(
      [generateMockCategory(1), generateMockCategory(2)],
      { status: 200 }
    );
  }),

  http.post(`${API_BASE}/categories`, () => {
    return HttpResponse.json(generateMockCategory(1), { status: 201 });
  }),

  // ========== POS / SALES ==========
  http.post(`${API_BASE}/sales/quick`, async () => {
    return HttpResponse.json(
      {
        id: 1,
        saleNumber: 'SALE-000001',
        status: 'COMPLETED',
        cashierId: 1,
        subtotal: '51.00',
        total: 51.00,
        amountReceived: '60.00',
        change: '9.00',
        paymentMethod: 'CASH',
        completedAt: new Date().toISOString(),
        details: [
          {
            id: 1,
            productId: 1,
            productName: 'Product 1',
            quantity: 2,
            unitPrice: '25.50',
            subtotal: '51.00',
          },
        ],
        version: 1,
      },
      { status: 201 }
    );
  }),

  http.post(`${API_BASE}/sales/:id/void`, () => {
    return HttpResponse.json(
      {
        id: 1,
        saleNumber: 'SALE-000001',
        status: 'VOIDED',
        cashierId: 1,
        subtotal: '51.00',
        total: '51.00',
        amountReceived: '60.00',
        change: '9.00',
        paymentMethod: 'CASH',
        completedAt: new Date().toISOString(),
        details: [],
        version: 2,
      },
      { status: 200 }
    );
  }),

  // ========== AI SCANNER ==========
  http.post(`${API_BASE}/scanner/ai`, async () => {
    return HttpResponse.json(
      {
        suggestions: [
          {
            productId: 1,
            productName: 'Producto Mock 1',
            barcode: '7701234567890',
            suggestedPrice: '29.99',
            confidence: 0.95,
          },
          {
            productId: 2,
            productName: 'Producto Mock 2',
            barcode: '7701234567891',
            suggestedPrice: '19.99',
            confidence: 0.87,
          },
          {
            productId: null,
            productName: 'Producto Mock 3',
            barcode: null,
            suggestedPrice: '49.99',
            confidence: 0.78,
          },
        ],
        processingTimeMs: 1234,
        strategyUsed: 'mock',
      },
      { status: 200 }
    );
  }),

  http.get(`${API_BASE}/scanner/ai/available`, () => {
    return HttpResponse.json({ available: true }, { status: 200 });
  }),

  // ========== INVENTORY / ALERTS ==========
  http.get(`${API_BASE}/alerts`, ({ request }) => {
    const url = new URL(request.url);
    const page = url.searchParams.get('page') || '0';
    return HttpResponse.json(
      {
        content: [
          generateMockAlert(1),
          { ...generateMockAlert(2), type: 'LOW_STOCK', severity: 'WARNING' },
        ],
        totalElements: 50,
        totalPages: 5,
        number: parseInt(page),
        pageSize: 10,
      },
      { status: 200 }
    );
  }),

  http.put(`${API_BASE}/alerts/:id/resolve`, () => {
    return HttpResponse.json(
      { ...generateMockAlert(1), resolved: true },
      { status: 200 }
    );
  }),

  http.put(`${API_BASE}/alerts/:id/read`, () => {
    return HttpResponse.json(
      { ...generateMockAlert(1), read: true },
      { status: 200 }
    );
  }),

  http.put(`${API_BASE}/alerts/read-all`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  http.put(`${API_BASE}/alerts/resolve-all`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${API_BASE}/alerts/unread/count`, () => {
    return HttpResponse.json({ count: 3 }, { status: 200 });
  }),

  // ========== PURCHASING ==========
  http.post(`${API_BASE}/purchase-orders`, () => {
    return HttpResponse.json(generateMockPurchaseOrder(1), { status: 201 });
  }),

  http.get(`${API_BASE}/purchase-orders`, ({ request }) => {
    const url = new URL(request.url);
    const page = url.searchParams.get('page') || '0';
    return HttpResponse.json(
      {
        content: [generateMockPurchaseOrder(1), generateMockPurchaseOrder(2)],
        totalElements: 25,
        totalPages: 3,
        number: parseInt(page),
        pageSize: 10,
      },
      { status: 200 }
    );
  }),

  http.get(`${API_BASE}/purchase-orders/:id`, () => {
    return HttpResponse.json(generateMockPurchaseOrder(1), { status: 200 });
  }),

  http.put(`${API_BASE}/purchase-orders/:id/receive`, () => {
    return HttpResponse.json(
      { ...generateMockPurchaseOrder(1), status: 'RECEIVED' },
      { status: 200 }
    );
  }),

  http.post(`${API_BASE}/purchase-orders/:id/clone`, () => {
    return HttpResponse.json(generateMockPurchaseOrder(999), { status: 201 });
  }),

  http.put(`${API_BASE}/purchase-orders/:id/void`, () => {
    return HttpResponse.json(
      { ...generateMockPurchaseOrder(1), status: 'VOIDED' },
      { status: 200 }
    );
  }),

  http.get(`${API_BASE}/suppliers`, () => {
    return HttpResponse.json(
      [
        { id: 1, name: 'Supplier 1', email: 'supplier1@test.com', phone: '555-0001' },
        { id: 2, name: 'Supplier 2', email: 'supplier2@test.com', phone: '555-0002' },
      ],
      { status: 200 }
    );
  }),

  // ========== DASHBOARD ==========
  http.get(`${API_BASE}/dashboard`, () => {
    return HttpResponse.json(
      {
        todaySales: '5000.00',
        todaySalesCount: 40,
        averageTicket: '125.50',
        outOfStockProducts: 3,
        outOfStockProductList: [{ productName: 'Product 9' }, { productName: 'Product 12' }],
        estimatedMonthlyProfit: '45000.00',
        lowStockAlertCount: 5,
        recentSales: [
          { saleId: 1, saleNumber: 'SALE-000001', total: '125.50', itemCount: 5, completedAt: new Date().toISOString(), cashierId: 2 },
          { saleId: 2, saleNumber: 'SALE-000002', total: '89.99', itemCount: 3, completedAt: new Date().toISOString(), cashierId: 3 },
        ],
      },
      { status: 200 }
    );
  }),

  // ========== AUDIT ==========
  http.get(`${API_BASE}/audit`, ({ request }) => {
    const url = new URL(request.url);
    const page = url.searchParams.get('page') || '0';
    return HttpResponse.json(
      {
        content: [
          {
            id: 1,
            action: 'CREATE',
            entityType: 'SALE',
            entityId: '1',
            previousData: {},
            newData: { total: 125.50, status: 'COMPLETED' },
            userId: 1,
            username: 'admin',
            timestamp: new Date().toISOString(),
          },
        ],
        totalElements: 100,
        totalPages: 10,
        number: parseInt(page),
        pageSize: 10,
      },
      { status: 200 }
    );
  }),
];
