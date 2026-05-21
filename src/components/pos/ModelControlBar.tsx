import React from 'react';
import { Cpu, Layers } from 'lucide-react';
import { useAiScanStore } from '../../stores/aiScanStore';
import type { AiModelMode } from '../../modules/types/ai.types';

export const ModelControlBar: React.FC = () => {
  const activeAiModel = useAiScanStore((s) => s.activeAiModel);
  const setActiveAiModel = useAiScanStore((s) => s.setActiveAiModel);
  const segmentationAvailable = useAiScanStore((s) => s.segmentationAvailable);

  const handleSelect = (mode: AiModelMode) => {
    if (mode === 'sam' && !segmentationAvailable) return;
    setActiveAiModel(mode);
  };

  return (
    <div className="absolute bottom-3 sm:bottom-4 right-3 sm:right-4 flex flex-col items-end gap-2 z-50 pointer-events-none">
      <div className="bg-gray-900/80 backdrop-blur-md rounded-xl sm:rounded-2xl p-1 flex items-center shadow-xl border border-white/10 pointer-events-auto">
        {/* YOLOv11 pill */}
        <button
          onClick={() => handleSelect('yolo')}
          className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 ${
            activeAiModel === 'yolo'
              ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.5)]'
              : 'text-gray-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <Cpu className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">YOLOv11</span>
          <span className="sm:hidden">YOLO</span>
        </button>

        {/* SAM pill */}
        <button
          onClick={() => handleSelect('sam')}
          disabled={!segmentationAvailable}
          className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 ${
            activeAiModel === 'sam'
              ? 'bg-emerald-600 text-white shadow-[0_0_12px_rgba(16,185,129,0.5)]'
              : segmentationAvailable
                ? 'text-gray-400 hover:text-white hover:bg-white/10'
                : 'text-gray-600 opacity-50 cursor-not-allowed'
          }`}
        >
          <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          SAM
        </button>
      </div>
    </div>
  );
};
