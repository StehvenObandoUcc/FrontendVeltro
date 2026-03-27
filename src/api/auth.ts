import apiClient from './client';
import type { LoginRequest, LoginResponse, RegisterRequest, User, Worker } from '../types';

export const authApi = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/auth/login', credentials);
    return response.data;
  },

  register: async (data: RegisterRequest): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post<{ success: boolean; message: string }>('/auth/register', data);
    return response.data;
  },

  createWorker: async (data: RegisterRequest): Promise<{ success: boolean; message: string; username: string; role: string }> => {
    const response = await apiClient.post<{ success: boolean; message: string; username: string; role: string }>('/auth/workers', data);
    return response.data;
  },

  getWorkers: async (): Promise<Worker[]> => {
    const response = await apiClient.get<Worker[]>('/auth/workers');
    return response.data;
  },

  deleteWorker: async (id: number): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete<{ success: boolean; message: string }>(`/auth/workers/${id}`);
    return response.data;
  },

  updateWorkerRole: async (id: number, role: string): Promise<Worker> => {
    const response = await apiClient.patch<Worker>(`/auth/workers/${id}/role`, { role });
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },

  getCurrentUser: async (): Promise<User> => {
    // Backend has no GET /auth/me endpoint.
    // User info is extracted from the JWT token at login time.
    // This method is kept for interface compatibility but should not be called.
    throw new Error('GET /auth/me is not implemented on the backend. Use login response data instead.');
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await apiClient.put('/auth/change-password', { currentPassword, newPassword });
  },
};
