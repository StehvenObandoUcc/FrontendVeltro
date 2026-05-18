import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAiScanQueue } from '../../hooks/useAiScanQueue';
import { useAiScanStore } from '../../stores/aiScanStore';
import { posApi } from '../../api/pos';

// Mock dependencies
vi.mock('../../stores/aiScanStore', () => ({
  useAiScanStore: vi.fn(),
}));

vi.mock('../../api/pos', () => ({
  posApi: {
    aiDetectFrame: vi.fn(),
  },
}));

vi.mock('../../workers/samMaskCache', () => ({
  samMaskCache: {
    getMask: vi.fn().mockReturnValue(null),
  },
}));

describe('useAiScanQueue', () => {
  let mockState: any;

  beforeEach(() => {
    vi.useFakeTimers();

    // Mock HTMLCanvasElement
    const mockContext = {
      imageSmoothingEnabled: false,
      imageSmoothingQuality: 'low',
      drawImage: vi.fn(),
      getImageData: vi.fn().mockReturnValue({ data: new Uint8ClampedArray(4) }),
      putImageData: vi.fn(),
    };

    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: () => mockContext,
          toBlob: (cb: any) => cb(new Blob(['fake-image'], { type: 'image/jpeg' })),
        } as any;
      }
      return originalCreateElement(tagName);
    });

    mockState = {
      aiEnabled: true,
      detections: [],
      setIsProcessing: vi.fn(),
      updateDetectionStatus: vi.fn(),
      updateDetectionMatches: vi.fn(),
    };

    (useAiScanStore as any).mockImplementation((selector: any) => selector(mockState));
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  const setupVideoRef = () => {
    return {
      current: {
        videoWidth: 1920,
        videoHeight: 1080,
      } as HTMLVideoElement,
    };
  };

  it('scenario 1: does not process if aiEnabled is false', () => {
    mockState.aiEnabled = false;
    mockState.detections = [{ id: '1', status: 'RAW', confidence: 0.9, x: 10, y: 10, width: 100, height: 100 }];

    renderHook(() => useAiScanQueue(setupVideoRef()));

    expect(mockState.updateDetectionStatus).not.toHaveBeenCalled();
  });

  it('scenario 2: ignores non-RAW detections', () => {
    mockState.detections = [
      { id: '1', status: 'PENDING', confidence: 0.9, x: 10, y: 10, width: 100, height: 100 },
      { id: '2', status: 'SUCCESS', confidence: 0.9, x: 10, y: 10, width: 100, height: 100 },
    ];

    renderHook(() => useAiScanQueue(setupVideoRef()));

    expect(mockState.updateDetectionStatus).not.toHaveBeenCalled();
  });

  it('scenario 3: picks the highest-confidence RAW detection', () => {
    mockState.detections = [
      { id: 'low-conf', status: 'RAW', confidence: 0.5, x: 10, y: 10, width: 100, height: 100 },
      { id: 'high-conf', status: 'RAW', confidence: 0.9, x: 10, y: 10, width: 100, height: 100 },
    ];

    renderHook(() => useAiScanQueue(setupVideoRef()));

    expect(mockState.updateDetectionStatus).toHaveBeenCalledWith('high-conf', 'PENDING');
  });

  it('scenario 4: sets status to ERROR if API call fails', async () => {
    mockState.detections = [{ id: '1', status: 'RAW', confidence: 0.9, x: 10, y: 10, width: 100, height: 100 }];
    (posApi.aiDetectFrame as any).mockRejectedValueOnce(new Error('Network error'));

    renderHook(() => useAiScanQueue(setupVideoRef()));

    expect(mockState.updateDetectionStatus).toHaveBeenCalledWith('1', 'PENDING');
    
    // Wait for async promises to settle
    await vi.runAllTimersAsync();
    
    expect(mockState.updateDetectionStatus).toHaveBeenCalledWith('1', 'ERROR');
  });

  it('scenario 5: sets status to SUCCESS and updates matches on API success', async () => {
    mockState.detections = [{ id: '1', status: 'RAW', confidence: 0.9, x: 10, y: 10, width: 100, height: 100 }];
    const mockMatches = [{ product_id: 'prod1', confidence: 0.95 }];
    (posApi.aiDetectFrame as any).mockResolvedValueOnce([{ matches: mockMatches }]);

    renderHook(() => useAiScanQueue(setupVideoRef()));

    expect(mockState.updateDetectionStatus).toHaveBeenCalledWith('1', 'PENDING');
    
    await vi.runAllTimersAsync();
    
    expect(mockState.updateDetectionMatches).toHaveBeenCalledWith('1', mockMatches);
    expect(mockState.updateDetectionStatus).toHaveBeenCalledWith('1', 'SUCCESS');
  });

  it('scenario 6: enforces cooldown period between calls', async () => {
    mockState.detections = [{ id: '1', status: 'RAW', confidence: 0.9, x: 10, y: 10, width: 100, height: 100 }];
    (posApi.aiDetectFrame as any).mockResolvedValueOnce({ matches: [] });

    const { rerender } = renderHook(() => useAiScanQueue(setupVideoRef()));
    
    expect(mockState.updateDetectionStatus).toHaveBeenCalledWith('1', 'PENDING');
    await vi.runAllTimersAsync();

    // Reset mock to check if it's called again
    mockState.updateDetectionStatus.mockClear();

    // Rerender with a new detection, but no time has passed
    mockState.detections = [{ id: '2', status: 'RAW', confidence: 0.9, x: 10, y: 10, width: 100, height: 100 }];
    rerender();
    
    // Should NOT have been called due to cooldown
    expect(mockState.updateDetectionStatus).not.toHaveBeenCalled();

    // Advance time past cooldown (2000ms)
    vi.advanceTimersByTime(2100);
    rerender();

    // Now it should be called
    expect(mockState.updateDetectionStatus).toHaveBeenCalledWith('2', 'PENDING');
  });
});
