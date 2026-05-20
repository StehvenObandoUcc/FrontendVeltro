import React from 'react';
import { Power, Scan, Layers } from 'lucide-react';
import { useAiScanStore } from '../../stores/aiScanStore';

export const ModelControlBar: React.FC = () => {
  const { aiEnabled, setAiEnabled, segmentationAvailable } = useAiScanStore();

  return (
    <div className="absolute top-4 left-0 right-0 flex justify-center z-50 pointer-events-none">
      <div className="bg-gray-900/80 backdrop-blur-md rounded-2xl p-2 flex items-center gap-3 shadow-xl border border-white/10 pointer-events-auto">
        
        {/* YOLO Toggle */}
        <button
          onClick={() => setAiEnabled(!aiEnabled)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${
            aiEnabled
              ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]'
              : 'bg-white/10 text-gray-400 hover:bg-white/20 hover:text-white'
          }`}
        >
          {aiEnabled ? <Power className="w-4 h-4 animate-pulse" /> : <Scan className="w-4 h-4" />}
          {aiEnabled ? 'AI Scanner Activo' : 'Activar AI Scanner'}
        </button>

        <div className="w-px h-8 bg-white/10" />

        {/* Segmentation Status (Disabled for now until EfficientSAM is validated) */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/40 text-xs font-medium text-gray-500 border border-white/5 cursor-not-allowed" title="La segmentación se habilitará cuando los modelos EfficientSAM estén validados.">
          <Layers className="w-3.5 h-3.5 opacity-50" />
          <span>
            {segmentationAvailable ? 'Segmentación: Lista' : 'Segmentación: No disponible'}
          </span>
        </div>

      </div>
    </div>
  );
};
