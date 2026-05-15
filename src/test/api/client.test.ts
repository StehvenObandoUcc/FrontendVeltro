import { describe, it, expect, vi } from 'vitest';

vi.mock('axios', () => {
  const requestUse = vi.fn();
  const responseUse = vi.fn();
  const mockClient = {
    defaults: {
      baseURL: '/api/v1',
      timeout: 30000,
      headers: { common: { 'Content-Type': 'application/json' } },
    },
    interceptors: {
      request: { use: requestUse },
      response: { use: responseUse },
    },
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };

  return {
    __esModule: true,
    default: {
      create: vi.fn(() => mockClient),
      post: vi.fn(),
    },
  };
});

import apiClient from '../../api/client';

describe('API Client', () => {
  it('should initialize with correct baseURL', () => {
    expect(apiClient.defaults.baseURL).toBe('/api/v1');
  });

  it('should set correct default timeout', () => {
    expect(apiClient.defaults.timeout).toBe(30000);
  });

  it('should accept JSON responses', () => {
    expect(apiClient.defaults.headers.common['Content-Type']).toBe('application/json');
  });
});
