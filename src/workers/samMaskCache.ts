import type { SegmentationMask } from '../modules/types/ai.types';

// In-memory Map (outside React/Zustand) to prevent UI freezes and memory leaks
const maskCache = new Map<string, SegmentationMask>();
// Map to track TTL timeouts for automatic eviction
const evictionTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

const MASK_TTL_MS = 10000; // 10 seconds auto-eviction policy

export const samMaskCache = {
  setMask: (id: string, mask: SegmentationMask) => {
    maskCache.set(id, mask);
    if (evictionTimeouts.has(id)) {
      clearTimeout(evictionTimeouts.get(id)!);
    }
    
    const timeout = setTimeout(() => {
      maskCache.delete(id);
      evictionTimeouts.delete(id);
    }, MASK_TTL_MS);
    
    evictionTimeouts.set(id, timeout);
  },
  
  getMask: (id: string) => maskCache.get(id),

  hasMask: (id: string) => maskCache.has(id),
  
  deleteMask: (id: string) => {
    maskCache.delete(id);
    if (evictionTimeouts.has(id)) {
      clearTimeout(evictionTimeouts.get(id)!);
      evictionTimeouts.delete(id);
    }
  },
  
  clear: () => {
    maskCache.clear();
    evictionTimeouts.forEach(clearTimeout);
    evictionTimeouts.clear();
  },
};
