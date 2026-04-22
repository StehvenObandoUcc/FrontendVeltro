import { useAuthStore } from '../stores/authStore';
import { useCartStore } from '../stores/cartStore';
import { useAlertStore } from '../stores/alertStore';
import { useAiScanStore } from '../stores/aiScanStore';
import { authApi } from '../api/auth';
import type { LoginRequest } from '../types';

export const useAuth = () => {
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setAuth = useAuthStore((s) => s.setAuth);
  const logoutStore = useAuthStore((s) => s.logout);
  const hasRole = useAuthStore((s) => s.hasRole);

  const login = async (credentials: LoginRequest) => {
    const response = await authApi.login(credentials);
    const user = {
      id: response.id ?? 0,
      username: response.username,
      email: response.email ?? '',
      role: response.role,
      businessId: response.businessId,
    };
    setAuth(user, response.accessToken, response.refreshToken);
    return response;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore errors — we still want to clear local state even if backend call fails
    }
    useCartStore.getState().clear();
    useAlertStore.getState().clearAll();
    useAiScanStore.getState().resetAiState();
    logoutStore();
  };

  return {
    user,
    accessToken,
    isAuthenticated,
    login,
    logout,
    hasRole,
  };
};
