import { Package, Plus } from 'lucide-react';
import { useAiScanStore } from '../../stores/aiScanStore';
import { useCartStore } from '../../stores/cartStore';
import type { MatchedProduct } from '../../modules/types/ai.types';
import type { Product } from '../../types';

interface AiResultsPanelProps {
  mode: 'pos-sell' | 'inventory-count';
}

export const AiResultsPanel: React.FC<AiResultsPanelProps> = ({ mode }) => {
  const { detections, isProcessing } = useAiScanStore();
  const { add: addToCart } = useCartStore();

  const handleAddToCart = (product: MatchedProduct) => {
    addToCart(product as unknown as Product, 1);
  };

  const confirmedDetections = detections.filter(d => d.matches && d.matches.length > 0);

  if (detections.length === 0 && !isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center text-gray-500">
        <Package className="w-12 h-12 mb-3 opacity-40" />
        <p className="font-medium">No hay productos detectados</p>
        <p className="text-sm mt-1 opacity-75">Apunta la cámara a un producto</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {confirmedDetections.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Resultados ({confirmedDetections.length})
          </h4>
          {confirmedDetections.map((det) => {
            const product = det.matches[0];
            return (
              <div key={det.id} className="flex items-center justify-between p-3 rounded-lg border bg-green-50 border-green-200">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate text-gray-900">{product.name}</p>
                  <p className="text-xs mt-0.5 text-gray-500">
                    Confianza: {(det.confidence * 100).toFixed(0)}%
                  </p>
                </div>
                
                {mode === 'pos-sell' && (
                  <button
                    onClick={() => handleAddToCart(product)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ml-2 bg-blue-600 text-white hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4" /> Agregar
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};