/**
 * Veltro AI Vision System - AI Scan Store
 * 
 * Zustand store for managing AI detection state.
 * Implements a Producer-Consumer pattern where YOLO produces raw boxes
 * and the API Queue consumes them to produce semantic matches.
 */

import { create } from 'zustand';
import type { ScanMode, AiUseCase, YoloBox, DetectionStatus, MatchedProduct, TrackedBox } from '../modules/types/ai.types';
import { samMaskCache } from '../workers/samMaskCache';

export type { TrackedBox } from '../modules/types/ai.types';

interface AiScanState {
  // Global modes
  scanMode: ScanMode;
  aiUseCase: AiUseCase;
  aiEnabled: boolean;
  isProcessing: boolean;
  selectedDetectionIds: string[];

  // SAM 2 States
  segmentationStatus: Record<string, 'pending' | 'ready' | 'error'>;
  samGlobalError: boolean;
  segmentationAvailable: boolean;

  // Data Store
  detections: YoloBox[];
  /** Visual tracking state  Eupdated by useYoloDetection IOU tracker, consumed by DetectionOverlay */
  trackedBoxes: TrackedBox[];

  // Mode Actions
  setScanMode: (mode: ScanMode) => void;
  setAiUseCase: (useCase: AiUseCase) => void;
  setAiEnabled: (enabled: boolean) => void;
  setIsProcessing: (processing: boolean) => void;
  
  // SAM 2 Actions
  setSegmentationStatus: (detectionId: string, status: 'pending' | 'ready' | 'error') => void;
  setSamGlobalError: (hasError: boolean) => void;
  setSegmentationAvailable: (available: boolean) => void;

  // Atomic Detection Actions
  /**
   * Updates raw detections from YOLO.
   * Compares incoming boxes with existing ones to preserve status and matches
   * for boxes that are spatially identical (prevents UI flickering).
   */
  setRawDetections: (newBoxes: YoloBox[]) => void;
  /** Replaces the visual tracked-box list; called by useYoloDetection when tracked IDs change */
  setTrackedBoxes: (boxes: TrackedBox[]) => void;
  
  /** Updates the lifecycle status of a specific detection */
  updateDetectionStatus: (id: string, status: DetectionStatus) => void;
  
  /** Sets the backend matches for a specific detection */
  updateDetectionMatches: (id: string, matches: MatchedProduct[]) => void;

  // Selection Actions
  selectDetection: (id: string) => void;
  deselectDetection: (id: string) => void;
  selectAllDetections: () => void;
  clearSelection: () => void;

  // Utility Actions
  clearDetections: () => void;
  resetAiState: () => void;
}

export const useAiScanStore = create<AiScanState>((set) => ({
  // Initial State
  scanMode: 'barcode',
  aiUseCase: 'pos-sell',
  aiEnabled: false,
  isProcessing: false,
  detections: [],
  trackedBoxes: [],
  selectedDetectionIds: [],
  segmentationStatus: {},
  samGlobalError: false,
  segmentationAvailable: false,

  // Global Mode Actions
  setScanMode: (mode) => set({ scanMode: mode }),
  setAiUseCase: (useCase) => set({ aiUseCase: useCase }),
  setAiEnabled: (enabled) => set({ aiEnabled: enabled }),
  setIsProcessing: (processing) => set({ isProcessing: processing }),

  // Atomic Detection Actions
  setTrackedBoxes: (boxes) => set({ trackedBoxes: boxes }),

  setRawDetections: (newBoxes) => set((state) => {
    const PRESERVED_STATUSES = new Set(['SUCCESS', 'PENDING', 'ERROR', 'ADDED']);

    // Detections with terminal/processing status are never removed by YOLO updates
    const preservedDetections = state.detections.filter((d) =>
      PRESERVED_STATUSES.has(d.status)
    );

    const updatedDetections = newBoxes.map((newBox) => {
      // Use IoU to match new boxes to existing ones across frames.
      // This is stable even when the box shifts slightly due to camera jitter.
      const existing = state.detections.find((old) => {
        const interX = Math.max(old.x, newBox.x);
        const interY = Math.max(old.y, newBox.y);
        const interW = Math.max(0, Math.min(old.x + old.width, newBox.x + newBox.width) - interX);
        const interH = Math.max(0, Math.min(old.y + old.height, newBox.y + newBox.height) - interY);
        if (interW <= 0 || interH <= 0) return false;
        const interArea = interW * interH;
        const unionArea = old.width * old.height + newBox.width * newBox.height - interArea;
        return (interArea / unionArea) > 0.3; // IoU > 30% = same object
      });

      if (existing) {
        // Preserve tracking state. If ADDED, don't reset  Euser already added it.
        return { ...newBox, id: existing.id, status: existing.status, matches: existing.matches };
      }
      return newBox; // New box  Efresh RAW status with new UUID
    });

    // Avoid duplicates: new detections overwrite preserved ones if they share an ID
    const newIds = new Set(updatedDetections.map((d) => d.id));
    const preserved = preservedDetections.filter((d) => !newIds.has(d.id));

    return { detections: [...updatedDetections, ...preserved] };
  }),

  updateDetectionStatus: (id, status) => set((state) => ({
    detections: state.detections.map((d) => 
      d.id === id ? { ...d, status } : d
    ),
  })),

  updateDetectionMatches: (id, matches) => set((state) => ({
    detections: state.detections.map((d) => 
      d.id === id ? { ...d, matches, status: 'SUCCESS' } : d
    ),
  })),

  // SAM 2 Actions
  setSegmentationStatus: (detectionId, status) => set((state) => ({
    segmentationStatus: {
      ...state.segmentationStatus,
      [detectionId]: status,
    },
  })),

  setSamGlobalError: (hasError) => set({ samGlobalError: hasError }),

  setSegmentationAvailable: (available) => set({ segmentationAvailable: available }),

  // Selection Actions
  selectDetection: (id) => set((state) => ({
    selectedDetectionIds: state.selectedDetectionIds.includes(id)
      ? state.selectedDetectionIds
      : [...state.selectedDetectionIds, id],
  })),

  deselectDetection: (id) => set((state) => ({
    selectedDetectionIds: state.selectedDetectionIds.filter((detId) => detId !== id),
  })),

  selectAllDetections: () => set((state) => ({
    selectedDetectionIds: state.detections.map((d) => d.id),
  })),

  clearSelection: () => set({ selectedDetectionIds: [] }),

  // Utility Actions
  clearDetections: () => {
    samMaskCache.clear();
    set({ 
      detections: [], 
      trackedBoxes: [],
      selectedDetectionIds: [],
      segmentationStatus: {},
    });
  },

  resetAiState: () => {
    samMaskCache.clear();
    set({
      detections: [],
      trackedBoxes: [],
      selectedDetectionIds: [],
      segmentationStatus: {},
      isProcessing: false,
    });
  },
}));

