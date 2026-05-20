import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSamSegmentation } from '../../hooks/useSamSegmentation';
import { useAiScanStore } from '../../stores/aiScanStore';
import { samMaskCache } from '../../workers/samMaskCache';
import * as aiScannerApi from '../../api/aiScannerApi';

// Mock the API
vi.mock('../../api/aiScannerApi', () => ({
  segmentWithAI: vi.fn(),
}));

// Mock the canvas getImageData and toBlob methods
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
  toBlob: vi.fn((callback) => callback(new Blob(['fake'], { type: 'image/jpeg' }))),
};

vi.stubGlobal('HTMLCanvasElement', class {
  constructor() {
    return mockCanvas;
  }
});

// Mock document.createElement to return our mock canvas
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

  it('clears cache on mount when active', () => {
    const cacheClearSpy = vi.spyOn(samMaskCache, 'clear');
    renderHook(() => useSamSegmentation(videoRef, true));
    expect(cacheClearSpy).toHaveBeenCalled();
  });

  it('processes frame and calls API when raw boxes exist', async () => {
    renderHook(() => useSamSegmentation(videoRef, true));

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

    // Simulate successful API call returning fake base64
    vi.mocked(aiScannerApi.segmentWithAI).mockResolvedValue('data:image/png;base64,AA==');

    const setMaskSpy = vi.spyOn(samMaskCache, 'setMask');

    act(() => {
      useAiScanStore.setState({ detections: [mockBox] });
    });

    // Wait for the async toBlob and API call
    await new Promise(process.nextTick);
    await new Promise(process.nextTick);

    expect(aiScannerApi.segmentWithAI).toHaveBeenCalled();
    expect(setMaskSpy).toHaveBeenCalledWith('box-123', expect.anything());
    expect(useAiScanStore.getState().segmentationStatus['box-123']).toBe('ready');
  });

  it('handles API error by setting status to error in store', async () => {
    renderHook(() => useSamSegmentation(videoRef, true));

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

    vi.mocked(aiScannerApi.segmentWithAI).mockResolvedValue(undefined);

    act(() => {
      useAiScanStore.setState({ detections: [mockBox] });
    });

    await new Promise(process.nextTick);
    await new Promise(process.nextTick);

    expect(useAiScanStore.getState().segmentationStatus['box-123']).toBe('error');
  });
});
