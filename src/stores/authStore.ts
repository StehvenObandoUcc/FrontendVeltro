import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LoginResponse, User, UserRole } from '../types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  setTokens: (auth: LoginResponse) => void;
  setAccessToken: (token: string) => void;
  logout: () => void;
  hasRole: (role: UserRole | UserRole[]) => boolean;
  getBusinessId: () => number | null;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      setAuth: (user, accessToken, refreshToken) => {
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
        });
      },

      setTokens: (auth) => {
        const existingUser = get().user;
        set({
          user: {
            id: auth.id ?? existingUser?.id ?? 0,
            username: auth.username ?? existingUser?.username ?? '',
            email: auth.email ?? existingUser?.email ?? '',
            role: auth.role ?? existingUser?.role ?? 'CASHIER',
            businessId: auth.businessId ?? existingUser?.businessId ?? null,
          },
          accessToken: auth.accessToken,
          refreshToken: auth.refreshToken,
          isAuthenticated: true,
        });
      },

      setAccessToken: (token) => {
        set({ accessToken: token });
      },

      logout: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },

      hasRole: (role) => {
        const user = get().user;
        if (!user) return false;
        if (Array.isArray(role)) {
          return role.includes(user.role);
        }
        return user.role === role;
      },

      getBusinessId: () => {
        const user = get().user;
        return user?.businessId ?? null;
      },
    }),
    {
      name: 'veltro-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
