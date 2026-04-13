/**
 * Veltro AI Vision System - Scan Mode Toggle Component
 * 
 * Toggle between Barcode scanning and AI Vision scanning modes.
 * Used at the top of the POS scanner section.
 */

import { Scan, Camera } from 'lucide-react';
import { useAiScanStore } from '../../stores/aiScanStore';

export const ScanModeToggle: React.FC = () => {
  const { scanMode, setScanMode } = useAiScanStore();

  return (
    <div 
      className="flex items-center gap-1 p-1 rounded-lg"
      style={{ 
        backgroundColor: 'var(--surface-inset)',
        border: '1px solid var(--border-light)'
      }}
      role="tablist"
      aria-label="Scan mode selection"
    >
      {/* Barcode Mode */}
      <button
        onClick={() => setScanMode('barcode')}
        role="tab"
        aria-selected={scanMode === 'barcode'}
        className="flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200"
        style={{
          backgroundColor: scanMode === 'barcode' ? 'var(--primary-base)' : 'transparent',
          color: scanMode === 'barcode' ? '#FFFFFF' : 'var(--text-secondary)',
          fontWeight: scanMode === 'barcode' ? 600 : 400,
        }}
      >
        <Scan className="w-4 h-4" />
        <span className="text-sm">Código de Barras</span>
      </button>

      {/* AI Mode */}
      <button
        onClick={() => setScanMode('ai')}
        role="tab"
        aria-selected={scanMode === 'ai'}
        className="flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200"
        style={{
          backgroundColor: scanMode === 'ai' ? 'var(--primary-base)' : 'transparent',
          color: scanMode === 'ai' ? '#FFFFFF' : 'var(--text-secondary)',
          fontWeight: scanMode === 'ai' ? 600 : 400,
        }}
      >
        <Camera className="w-4 h-4" />
        <span className="text-sm">Reconocimiento IA</span>
      </button>
    </div>
  );
};