import apiClient from './client';
import { hashPassword } from '../utils/password';
import type {
  ApiSuccessResponse,
  CreateWorkerResponse,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  UserRole,
  Worker,
} from '../types';

export const authApi = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const hashed = {
      ...credentials,
      password: await hashPassword(credentials.password),
    };
    const response = await apiClient.post<LoginResponse>('/auth/login', hashed);
    return response.data;
  },

  register: async (data: RegisterRequest): Promise<ApiSuccessResponse> => {
    const hashed = {
      ...data,
      password: await hashPassword(data.password),
    };
    const response = await apiClient.post<ApiSuccessResponse>('/auth/register', hashed);
    return response.data;
  },

  createWorker: async (data: RegisterRequest): Promise<CreateWorkerResponse> => {
    const hashed = {
      ...data,
      password: await hashPassword(data.password),
    };
    const response = await apiClient.post<CreateWorkerResponse>('/auth/workers', hashed);
    return response.data;
  },

  getWorkers: async (): Promise<Worker[]> => {
    const response = await apiClient.get<Worker[]>('/auth/workers');
    return response.data;
  },

  getWorkerCount: async (): Promise<{ count: number }> => {
    const response = await apiClient.get<{ count: number }>('/auth/workers/count');
    return response.data;
  },

  deleteWorker: async (id: number): Promise<ApiSuccessResponse> => {
    const response = await apiClient.delete<ApiSuccessResponse>(`/auth/workers/${id}`);
    return response.data;
  },

  updateWorkerRole: async (id: number, role: UserRole): Promise<Worker> => {
    const response = await apiClient.patch<Worker>(`/auth/workers/${id}/role`, { role });
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    const [hashedCurrent, hashedNew] = await Promise.all([
      hashPassword(currentPassword),
      hashPassword(newPassword),
    ]);
    await apiClient.put('/auth/change-password', { 
      currentPassword: hashedCurrent, 
      newPassword: hashedNew 
    });
  },
};
