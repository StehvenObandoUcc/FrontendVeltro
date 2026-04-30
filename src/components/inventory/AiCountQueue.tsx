import { Trash2, Loader2 } from 'lucide-react';

export interface CountQueueItem {
  productId: number;
  productName: string;
  quantity: number;
}

interface AiCountQueueProps {
  queue: CountQueueItem[];
  isApplying: boolean;
  applyMessage: string | null;
  onUpdateQuantity: (productId: number, quantity: number) => void;
  onRemove: (productId: number) => void;
  onApply: () => Promise<void>;
  onClear: () => void;
}

export function AiCountQueue({
  queue,
  isApplying,
  applyMessage,
  onUpdateQuantity,
  onRemove,
  onApply,
  onClear,
}: AiCountQueueProps) {
  return (
    <div className="card p-4 mt-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-[var(--text-primary)]">Cola de conteo IA</h3>
        <button
          onClick={onClear}
          disabled={queue.length === 0 || isApplying}
          className="btn-secondary px-3 py-1 text-sm"
        >
          Limpiar cola
        </button>
      </div>

      {queue.length === 0 ? (
        <p className="text-sm text-[var(--text-tertiary)]">No hay productos confirmados aun.</p>
      ) : (
        <div className="space-y-2">
          {queue.map((item) => (
            <div key={item.productId} className="flex items-center gap-3 border border-[var(--border-light)] rounded-lg p-2">
              <div className="flex-1">
                <p className="text-sm font-medium text-[var(--text-primary)]">{item.productName}</p>
                <p className="text-xs text-[var(--text-tertiary)]">ID: {item.productId}</p>
              </div>
              <input
                type="number"
                min={1}
                value={item.quantity}
                onChange={(event) => onUpdateQuantity(item.productId, Number(event.target.value))}
                className="input-base w-24"
              />
              <button
                onClick={() => onRemove(item.productId)}
                className="btn-secondary p-2"
                aria-label={`Eliminar ${item.productName}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {applyMessage && <p className="text-sm text-[var(--text-secondary)]">{applyMessage}</p>}

      <button
        onClick={() => void onApply()}
        disabled={queue.length === 0 || isApplying}
        className="btn-primary w-full inline-flex items-center justify-center gap-2"
      >
        {isApplying && <Loader2 className="w-4 h-4 animate-spin" />}
        {isApplying ? 'Aplicando...' : 'Aplicar al inventario'}
      </button>
    </div>
  );
}
