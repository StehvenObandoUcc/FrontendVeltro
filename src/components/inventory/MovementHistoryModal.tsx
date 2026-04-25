import type { InventoryItem, InventoryMovement } from '../../api/inventory';
import { formatDate } from '../../utils/format';

interface MovementHistoryModalProps {
  isOpen: boolean;
  item: InventoryItem | null;
  loading: boolean;
  movements: InventoryMovement[];
  onClose: () => void;
}

const getMovementTypeLabel = (type: string) => {
  const labels: Record<string, { text: string; color: string }> = {
    ENTRY: { text: 'Entrada', color: 'text-green-600' },
    EXIT: { text: 'Salida', color: 'text-red-600' },
    ADJUSTMENT: { text: 'Ajuste', color: 'text-blue-600' },
    SALE: { text: 'Venta', color: 'text-purple-600' },
  };
  return labels[type] || { text: type, color: 'text-gray-600' };
};

export function MovementHistoryModal({
  isOpen,
  item,
  loading,
  movements,
  onClose,
}: MovementHistoryModalProps) {
  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="card w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Historial de Movimientos
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

          {loading ? (
            <div className="flex justify-center py-8">
              <div
                className="animate-spin rounded-full h-8 w-8"
                style={{
                  borderColor: 'rgba(3, 142, 87, 0.2)',
                  borderTopColor: 'var(--primary-base)',
                  borderWidth: '3px',
                }}
              />
            </div>
          ) : movements.length === 0 ? (
            <p className="text-center py-8" style={{ color: 'var(--text-tertiary)' }}>No hay movimientos registrados</p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
              {movements.map((mov) => {
                const typeInfo = getMovementTypeLabel(mov.movementType);
                return (
                  <div key={mov.id} className="p-3 rounded-lg" style={{ backgroundColor: 'var(--surface-tertiary)' }}>
                    <div className="flex justify-between items-start">
                      <span className={`font-medium ${typeInfo.color}`}>{typeInfo.text}</span>
                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{formatDate(mov.createdAt)}</span>
                    </div>
                    <div className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                      {mov.previousStock} {'->'} {mov.newStock} ({mov.quantity > 0 ? '+' : ''}{mov.newStock - mov.previousStock})
                    </div>
                    <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{mov.reason}</div>
                    <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Por: {mov.createdBy}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
