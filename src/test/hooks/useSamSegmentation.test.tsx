import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSamSegmentation } from '../../hooks/useSamSegmentation';
import { useAiScanStore } from '../../stores/aiScanStore';
import { samMaskCache } from '../../workers/samMaskCache';

// Mock the global Worker object
class MockWorker {
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: ((e: any) => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();
  
  constructor(public url: URL, public options?: any) {
    MockWorker.instances.push(this);
  }

  static instances: MockWorker[] = [];
  static clear() {
    MockWorker.instances = [];
  }
}

vi.stubGlobal('Worker', MockWorker);

// Mock the canvas getImageData and drawImage methods
const mockContext = {
  fillStyle: '',
  fillRect: vi.fn(),
  drawImage: vi.fn(),
  getImageData: vi.fn(() => ({
    data: new Uint8ClampedArray(1024 * 1024 * 4),
  })),
};

const mockCanvas = {
  getContext: vi.fn(() => mockContext),
  width: 1024,
  height: 1024,
};

vi.stubGlobal('HTMLCanvasElement', class {
  constructor() {
    return mockCanvas;
  }
});

// Mock document.createElement to return our mock canvas for offscreen processing
const originalCreateElement = document.createElement;
vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
  if (tagName === 'canvas') {
    return mockCanvas as any;
  }
  return originalCreateElement.call(document, tagName);
});

describe('useSamSegmentation hook', () => {
  let videoRef: React.RefObject<HTMLVideoElement>;

  beforeEach(() => {
    vi.clearAllMocks();
    MockWorker.clear();
    samMaskCache.clear();
    useAiScanStore.getState().resetAiState();
    useAiScanStore.setState({ samGlobalError: false });

    // Mock video element ref
    videoRef = {
      current: {
        readyState: 4,
        videoWidth: 640,
        videoHeight: 480,
      } as unknown as HTMLVideoElement,
    };
  });

  it('instantiates worker and clears cache on mount when active', () => {
    const cacheClearSpy = vi.spyOn(samMaskCache, 'clear');
    renderHook(() => useSamSegmentation(videoRef, true));

    expect(MockWorker.instances.length).toBe(1);
    expect(cacheClearSpy).toHaveBeenCalled();
  });

  it('does not instantiate worker if active is false', () => {
    renderHook(() => useSamSegmentation(videoRef, false));
    expect(MockWorker.instances.length).toBe(0);
  });

  it('terminates worker on unmount', () => {
    const { unmount } = renderHook(() => useSamSegmentation(videoRef, true));
    const workerInstance = MockWorker.instances[0];
    unmount();
    expect(workerInstance.terminate).toHaveBeenCalled();
  });

  it('processes and posts frame to worker when raw boxes exist', async () => {
    renderHook(() => useSamSegmentation(videoRef, true));
    const workerInstance = MockWorker.instances[0];

    const mockBox = {
      id: 'box-123',
      x: 10,
      y: 20,
      width: 100,
      height: 150,
      confidence: 0.9,
      className: 'bottle',
      status: 'RAW' as const,
      matches: [],
    };

    // Trigger raw box arrival in store
    act(() => {
      useAiScanStore.setState({ detections: [mockBox] });
    });

    // Wait a brief tick for the Zustand subscribe trigger
    await Promise.resolve();

    expect(workerInstance.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'PROCESS_BOXES',
        boxes: [mockBox],
        videoWidth: 640,
        videoHeight: 480,
      }),
      expect.any(Array)
    );
  });

  it('handles ready mask from worker, storing it in samMaskCache and updating status', async () => {
    renderHook(() => useSamSegmentation(videoRef, true));
    const workerInstance = MockWorker.instances[0];

    const mockBox = {
      id: 'box-123',
      x: 10,
      y: 20,
      width: 100,
      height: 150,
      confidence: 0.9,
      className: 'bottle',
      status: 'RAW' as const,
      matches: [],
    };

    act(() => {
      useAiScanStore.setState({ detections: [mockBox] });
    });

    const setMaskSpy = vi.spyOn(samMaskCache, 'setMask');

    // Simulate worker sending MASK_READY event
    const mockMask = {
      detectionId: 'box-123',
      maskData: new Uint8Array(1024 * 1024),
      maskWidth: 1024,
      maskHeight: 1024,
    };

    act(() => {
      workerInstance.onmessage?.({
        data: {
          type: 'MASK_READY',
          boxId: 'box-123',
          mask: mockMask,
        },
      } as MessageEvent);
    });

    expect(setMaskSpy).toHaveBeenCalledWith('box-123', mockMask);
    expect(useAiScanStore.getState().segmentationStatus['box-123']).toBe('ready');
  });

  it('handles worker error by setting samGlobalError to true in store', () => {
    renderHook(() => useSamSegmentation(videoRef, true));
    const workerInstance = MockWorker.instances[0];

    act(() => {
      workerInstance.onmessage?.({
        data: {
          type: 'ERROR',
          error: 'OOM error',
        },
      } as MessageEvent);
    });

    expect(useAiScanStore.getState().samGlobalError).toBe(true);
  });
});
