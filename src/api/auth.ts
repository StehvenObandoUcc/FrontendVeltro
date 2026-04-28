import apiClient from './client';
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
    const response = await apiClient.post<LoginResponse>('/auth/login', credentials);
    return response.data;
  },

  register: async (data: RegisterRequest): Promise<ApiSuccessResponse> => {
    const response = await apiClient.post<ApiSuccessResponse>('/auth/register', data);
    return response.data;
  },

  createWorker: async (data: RegisterRequest): Promise<CreateWorkerResponse> => {
    const response = await apiClient.post<CreateWorkerResponse>('/auth/workers', data);
    return response.data;
  },

  getWorkers: async (): Promise<Worker[]> => {
    const response = await apiClient.get<Worker[]>('/auth/workers');
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
    await apiClient.put('/auth/change-password', { currentPassword, newPassword });
  },
};
