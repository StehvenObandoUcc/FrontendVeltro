import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { RoleGuard } from '../../components/auth/RoleGuard';

vi.mock('../../stores/authStore', () => ({
  useAuthStore: vi.fn(),
}));

import { useAuthStore } from '../../stores/authStore';

describe('RoleGuard Component', () => {
  it('should render children when user has allowed role', () => {
    vi.mocked(useAuthStore).mockImplementation((selector: any) => {
      const state = {
        user: { id: 1, email: 'test@example.com', role: 'ADMIN', username: 'admin', businessId: 1 },
        accessToken: 'token',
        refreshToken: 'refresh',
        isAuthenticated: true,
        setAuth: vi.fn(),
        setAccessToken: vi.fn(),
        logout: vi.fn(),
        hasRole: vi.fn(),
        getBusinessId: vi.fn(),
      };
      return selector ? selector(state) : state;
    });

    render(
      <BrowserRouter>
        <RoleGuard allowedRoles={['ADMIN']}>
          <div>Protected Content</div>
        </RoleGuard>
      </BrowserRouter>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('should redirect to /unauthorized when user does not have allowed role', () => {
    vi.mocked(useAuthStore).mockImplementation((selector: any) => {
      const state = {
        user: { id: 1, email: 'test@example.com', role: 'CASHIER', username: 'cashier', businessId: 1 },
        accessToken: 'token',
        refreshToken: 'refresh',
        isAuthenticated: true,
        setAuth: vi.fn(),
        setAccessToken: vi.fn(),
        logout: vi.fn(),
        hasRole: vi.fn(),
        getBusinessId: vi.fn(),
      };
      return selector ? selector(state) : state;
    });

    render(
      <BrowserRouter>
        <RoleGuard allowedRoles={['ADMIN']}>
          <div>Protected Content</div>
        </RoleGuard>
      </BrowserRouter>
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should allow access when user has one of multiple allowed roles', () => {
    vi.mocked(useAuthStore).mockImplementation((selector: any) => {
      const state = {
        user: { id: 1, email: 'test@example.com', role: 'WAREHOUSE', username: 'warehouse', businessId: 1 },
        accessToken: 'token',
        refreshToken: 'refresh',
        isAuthenticated: true,
        setAuth: vi.fn(),
        setAccessToken: vi.fn(),
        logout: vi.fn(),
        hasRole: vi.fn(),
        getBusinessId: vi.fn(),
      };
      return selector ? selector(state) : state;
    });

    render(
      <BrowserRouter>
        <RoleGuard allowedRoles={['ADMIN', 'WAREHOUSE']}>
          <div>Protected Content</div>
        </RoleGuard>
      </BrowserRouter>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('should handle case-insensitive role comparison', () => {
    vi.mocked(useAuthStore).mockImplementation((selector: any) => {
      const state = {
        user: { id: 1, email: 'test@example.com', role: 'admin' as any, username: 'admin', businessId: 1 },
        accessToken: 'token',
        refreshToken: 'refresh',
        isAuthenticated: true,
        setAuth: vi.fn(),
        setAccessToken: vi.fn(),
        logout: vi.fn(),
        hasRole: vi.fn(),
        getBusinessId: vi.fn(),
      };
      return selector ? selector(state) : state;
    });

    render(
      <BrowserRouter>
        <RoleGuard allowedRoles={['ADMIN']}>
          <div>Protected Content</div>
        </RoleGuard>
      </BrowserRouter>
    );
  });

  it('should deny access when user role is undefined', () => {
    vi.mocked(useAuthStore).mockImplementation((selector: any) => {
      const state = {
        user: { id: 1, email: 'test@example.com', role: undefined as any, username: 'user', businessId: 1 },
        accessToken: 'token',
        refreshToken: 'refresh',
        isAuthenticated: true,
        setAuth: vi.fn(),
        setAccessToken: vi.fn(),
        logout: vi.fn(),
        hasRole: vi.fn(),
        getBusinessId: vi.fn(),
      };
      return selector ? selector(state) : state;
    });

    render(
      <BrowserRouter>
        <RoleGuard allowedRoles={['ADMIN']}>
          <div>Protected Content</div>
        </RoleGuard>
      </BrowserRouter>
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });
});
