import { act, renderHook } from '@testing-library/react';
import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAlerts } from '../../hooks/useAlerts';
import { useAlertStore } from '../../stores/alertStore';
import { useAuthStore } from '../../stores/authStore';
import { inventoryApi } from '../../api/inventory';

vi.mock('../../api/inventory', async () => {
  const actual = await vi.importActual<typeof import('../../api/inventory')>('../../api/inventory');
  return {
    ...actual,
    inventoryApi: {
      ...actual.inventoryApi,
      getUnreadAlertCount: vi.fn(),
    },
  };
});

const getUnreadAlertCountMock = vi.mocked(inventoryApi.getUnreadAlertCount);

describe('useAlerts', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    useAuthStore.setState({ isAuthenticated: false });
    useAlertStore.getState().clearAll();
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });
  });

  it('starts polling only when authenticated', async () => {
    getUnreadAlertCountMock.mockResolvedValue({ count: 5 });

    renderHook(() => useAlerts());
    await vi.runAllTimersAsync();
    expect(getUnreadAlertCountMock).not.toHaveBeenCalled();

    await act(async () => {
      useAuthStore.setState({ isAuthenticated: true });
    });
    renderHook(() => useAlerts());
    await Promise.resolve();
    expect(getUnreadAlertCountMock).toHaveBeenCalled();
  });

  it('stops updating store after unmount', async () => {
    useAuthStore.setState({ isAuthenticated: true });

    let resolveRequest: ((value: { count: number }) => void) | null = null;
    getUnreadAlertCountMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        })
    );

    const { unmount } = renderHook(() => useAlerts());
    unmount();

    await act(async () => {
      resolveRequest?.({ count: 9 });
      await Promise.resolve();
    });

    expect(useAlertStore.getState().unreadCount).toBe(0);
  });

  it('does not overlap requests', async () => {
    useAuthStore.setState({ isAuthenticated: true });

    let resolveFirstRequest: ((value: { count: number }) => void) | null = null;
    getUnreadAlertCountMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFirstRequest = resolve;
        })
    );
    getUnreadAlertCountMock.mockResolvedValue({ count: 2 });

    renderHook(() => useAlerts());
    expect(getUnreadAlertCountMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(30_000);
    expect(getUnreadAlertCountMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveFirstRequest?.({ count: 1 });
      await Promise.resolve();
    });

    await vi.advanceTimersByTimeAsync(30_000);
    expect(getUnreadAlertCountMock).toHaveBeenCalledTimes(2);
  });

  it('pauses polling when tab is hidden and fetches again when visible', async () => {
    useAuthStore.setState({ isAuthenticated: true });
    getUnreadAlertCountMock.mockResolvedValue({ count: 3 });

    renderHook(() => useAlerts());
    await Promise.resolve();
    const callCountAfterInitialFetch = getUnreadAlertCountMock.mock.calls.length;
    expect(callCountAfterInitialFetch).toBe(1);

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    });

    await vi.advanceTimersByTimeAsync(30_000);
    expect(getUnreadAlertCountMock.mock.calls.length).toBe(callCountAfterInitialFetch);

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });
    document.dispatchEvent(new Event('visibilitychange'));
    await Promise.resolve();

    expect(getUnreadAlertCountMock.mock.calls.length).toBe(callCountAfterInitialFetch + 1);
  });

  it('stops polling loop on 401 and 403', async () => {
    useAuthStore.setState({ isAuthenticated: true });

    vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);
    getUnreadAlertCountMock.mockRejectedValue({
      response: { status: 401 },
    });

    renderHook(() => useAlerts());
    await vi.runOnlyPendingTimersAsync();
    expect(getUnreadAlertCountMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(120_000);
    expect(getUnreadAlertCountMock).toHaveBeenCalledTimes(1);
  });
});
