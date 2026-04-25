import type { InventoryItem } from '../../api/inventory';

type StockMovementType = 'entry' | 'exit' | 'adjustment';

interface StockMovementModalProps {
  isOpen: boolean;
  type: StockMovementType | null;
  item: InventoryItem | null;
  quantity: string;
  reason: string;
  newStock: string;
  loading: boolean;
  onClose: () => void;
  onQuantityChange: (value: string) => void;
  onReasonChange: (value: string) => void;
  onNewStockChange: (value: string) => void;
  onSubmit: () => void;
}

export function StockMovementModal({
  isOpen,
  type,
  item,
  quantity,
  reason,
  newStock,
  loading,
  onClose,
  onQuantityChange,
  onReasonChange,
  onNewStockChange,
  onSubmit,
}: StockMovementModalProps) {
  if (!isOpen || !type || !item) return null;

  const isEntry = type === 'entry';
  const isExit = type === 'exit';
  const isAdjustment = type === 'adjustment';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="card w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              {isEntry && 'Registrar Entrada'}
              {isExit && 'Registrar Salida'}
              {isAdjustment && 'Ajustar Stock'}
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded-md transition-colors"
              style={{ color: 'var(--text-tertiary)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-tertiary)')}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--surface-tertiary)' }}>
            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{item.productName}</p>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Stock actual: {item.currentStock}</p>
          </div>

          {isEntry && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Cantidad</label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => onQuantityChange(e.target.value)}
                  className="input-base"
                  placeholder="Cantidad a agregar"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Razón</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => onReasonChange(e.target.value)}
                  className="input-base"
                  placeholder="Ej: Compra a proveedor"
                />
              </div>
              <button
                onClick={onSubmit}
                disabled={loading || !quantity || !reason}
                className="btn-primary w-full"
              >
                {loading ? 'Procesando...' : 'Registrar Entrada'}
              </button>
            </div>
          )}

          {isExit && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Cantidad</label>
                <input
                  type="number"
                  min="1"
                  max={item.currentStock}
                  value={quantity}
                  onChange={(e) => onQuantityChange(e.target.value)}
                  className="input-base"
                  placeholder="Cantidad a retirar"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Razón</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => onReasonChange(e.target.value)}
                  className="input-base"
                  placeholder="Ej: Merma, devolución"
                />
              </div>
              <button
                onClick={onSubmit}
                disabled={loading || !quantity || !reason}
                className="btn-danger w-full"
              >
                {loading ? 'Procesando...' : 'Registrar Salida'}
              </button>
            </div>
          )}

          {isAdjustment && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Nuevo Stock</label>
                <input
                  type="number"
                  min="0"
                  value={newStock}
                  onChange={(e) => onNewStockChange(e.target.value)}
                  className="input-base"
                  placeholder="Nueva cantidad total"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Razón del ajuste</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => onReasonChange(e.target.value)}
                  className="input-base"
                  placeholder="Ej: Conteo físico, corrección"
                />
              </div>
              <button
                onClick={onSubmit}
                disabled={loading || !newStock || !reason}
                className="w-full py-3 rounded-lg font-semibold text-white transition-all"
                style={{ backgroundColor: '#3B82F6' }}
                onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = '#2563EB'}
                onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = '#3B82F6'}
              >
                {loading ? 'Procesando...' : 'Ajustar Stock'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
