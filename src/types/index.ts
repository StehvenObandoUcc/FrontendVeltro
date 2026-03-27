// API Response wrapper
export interface ApiResponse<T> {
  data: T;
  message?: string;
  timestamp: string;
}

// Paginated response (Spring Boot sends 'number' for current page)
export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
}

// User roles
export type UserRole = 'ADMIN' | 'CASHIER' | 'WAREHOUSE';

// Auth types
export interface User {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  businessId: number | null;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  role?: string;
  businessName?: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  username: string;
  role: UserRole;
  businessId: number | null;
  id?: number;
  email?: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  username: string;
  role: UserRole;
  businessId: number | null;
  id?: number;
  email?: string;
}

// Product types
export interface Product {
  id: number;
  name: string;
  barcode: string | null;
  sku: string | null;
  description: string | null;
  costPrice: string;
  salePrice: string;
  categoryId: number | null;
  categoryName: string | null;
  minStockInfo: number | null;
  minStockWarning: number | null;
  minStockCritical: number | null;
  active: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface ProductRequest {
  name: string;
  barcode?: string;
  sku?: string;
  description?: string;
  costPrice: string;
  salePrice: string;
  categoryId?: number;
  minStockInfo?: number;
  minStockWarning?: number;
  minStockCritical?: number;
}

// Category types
export interface Category {
  id: number;
  name: string;
  description: string | null;
  parentCategoryId: number | null;
  parentCategoryName: string | null;
  active: boolean;
  children?: Category[];
}

export interface CategoryRequest {
  name: string;
  description?: string;
  parentCategoryId?: number;
}

// Inventory types
export interface Inventory {
  id: number;
  productId: number;
  productName: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
}

// Error response
export interface ApiError {
  success?: boolean;
  error?: string;
  message: string;
  code?: string;
  timestamp: string;
  path?: string;
  details?: Record<string, string>;
}

// Worker types
export interface Worker {
  id: number;
  username: string;
  email: string;
  role: string;
  active: boolean;
  createdAt: string;
}
