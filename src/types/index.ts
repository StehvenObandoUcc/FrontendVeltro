/** Paginated response (Spring Boot sends `number` for current page). */
export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
}

/** Supported user roles in the application. */
export type UserRole = 'ADMIN' | 'CASHIER' | 'WAREHOUSE';

/** Authenticated user payload. */
export interface User {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  businessId: number | null;
  businessName?: string;
  adminName?: string;
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

/** Shared token response returned by login and refresh endpoints. */
export interface AuthTokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  username: string;
  role: UserRole;
  businessId: number | null;
  id?: number;
  email?: string;
  businessName?: string;
  adminName?: string;
}

export type LoginResponse = AuthTokenResponse;
export type RefreshResponse = AuthTokenResponse;

/** Standard success payload returned by write-only endpoints. */
export interface ApiSuccessResponse {
  success: boolean;
  message: string;
}

/** Success payload returned when a worker is created. */
export interface CreateWorkerResponse extends ApiSuccessResponse {
  username: string;
  role: UserRole;
}

/** Product entity returned by catalog endpoints. */
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

/** Category entity used by catalog tree endpoints. */
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

/** Normalized API error payload. */
export interface ApiError {
  success?: boolean;
  error?: string;
  message: string;
  code?: string;
  timestamp: string;
  path?: string;
  details?: Record<string, string>;
}

/** Worker account used in employee management. */
export interface Worker {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
}
