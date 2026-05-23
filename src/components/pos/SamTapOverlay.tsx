/**
 * SamTapOverlay — Fixed Detection Zone for SAM Mode
 *
 * Renders a fixed detection zone in the center of the camera feed.
 * The user places a product inside the zone. The useSamTapSegmentation hook
 * automatically captures and segments every few seconds.
 */

import React from 'react';
import { useAiScanStore } from '../../stores/aiScanStore';

interface Props {
  videoRef: React.RefObject<HTMLVideoElement>;
}

export const SamTapOverlay: React.FC<Props> = () => {
  const samTapEntries = useAiScanStore((s) => s.samTapEntries);
  const activeEntry = samTapEntries[0]; // Single zone entry

  const isProcessing = activeEntry && (activeEntry.status === 'segmenting' || activeEntry.status === 'matching');
  const isMatched = activeEntry?.status === 'matched';

  return (
    <div className="absolute inset-0 z-10 pointer-events-none">
      {/* Fixed detection zone — center of frame */}
      <div
        className="absolute border-2 rounded-xl transition-colors duration-500"
        style={{
          left: '15%',
          top: '15%',
          width: '70%',
          height: '70%',
          borderColor: isMatched
            ? 'rgba(16, 185, 129, 0.8)'
            : isProcessing
              ? 'rgba(59, 130, 246, 0.7)'
              : 'rgba(255, 255, 255, 0.4)',
          borderStyle: isMatched ? 'solid' : 'dashed',
          backgroundColor: isMatched
            ? 'rgba(16, 185, 129, 0.05)'
            : 'transparent',
        }}
      >
        {/* Corner markers */}
        <div className="absolute -top-0.5 -left-0.5 w-5 h-5 border-t-2 border-l-2 border-white/70 rounded-tl-lg" />
        <div className="absolute -top-0.5 -right-0.5 w-5 h-5 border-t-2 border-r-2 border-white/70 rounded-tr-lg" />
        <div className="absolute -bottom-0.5 -left-0.5 w-5 h-5 border-b-2 border-l-2 border-white/70 rounded-bl-lg" />
        <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 border-b-2 border-r-2 border-white/70 rounded-br-lg" />
      </div>

      {/* Status label */}
      <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: '10%' }}>
        {!activeEntry && (
          <span className="bg-black/50 backdrop-blur-sm text-white/80 text-xs sm:text-sm px-4 py-2 rounded-xl border border-white/10">
            <span className="sm:hidden">Coloca el producto aquí</span>
            <span className="hidden sm:inline">Coloca el producto dentro del recuadro</span>
          </span>
        )}

        {isProcessing && (
          <span className="bg-blue-600/80 backdrop-blur-sm text-white text-xs sm:text-sm px-4 py-2 rounded-xl animate-pulse">
            {activeEntry.status === 'segmenting' ? 'Segmentando...' : 'Identificando...'}
          </span>
        )}

        {isMatched && activeEntry.matchedProduct && (
          <span className="bg-emerald-600/90 backdrop-blur-sm text-white text-xs sm:text-sm font-semibold px-4 py-2 rounded-xl shadow-lg">
            ✓ {activeEntry.matchedProduct.name}
          </span>
        )}

        {activeEntry?.status === 'error' && (
          <span className="bg-red-600/80 backdrop-blur-sm text-white text-xs sm:text-sm px-4 py-2 rounded-xl">
            No identificado — reintentando...
          </span>
        )}
      </div>
    </div>
  );
};
