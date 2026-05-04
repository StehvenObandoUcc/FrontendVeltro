import { useState, useEffect, useRef } from 'react';
import { Camera, ArrowLeft, X } from 'lucide-react';
import { AiScannerContainer } from '../../components/pos/AiScannerContainer';
import { StockMovementModal } from '../../components/inventory/StockMovementModal';
import { MovementHistoryModal } from '../../components/inventory/MovementHistoryModal';
import { AlertConfigForm } from '../../components/inventory/AlertConfigForm';
import { AiCountQueue, type CountQueueItem } from '../../components/inventory/AiCountQueue';
import {
  inventoryApi,
  type AlertConfig,
  type InventoryItem,
  type InventoryMovement,
  type PageResponse,
} from '../../api/inventory';

type ModalType = 'entry' | 'exit' | 'adjustment' | 'history' | null;

export function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showAiScanner, setShowAiScanner] = useState(false);
  const [countQueue, setCountQueue] = useState<CountQueueItem[]>([]);
  const [isApplyingCountQueue, setIsApplyingCountQueue] = useState(false);
  const [countQueueMessage, setCountQueueMessage] = useState<string | null>(null);

  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [configItem, setConfigItem] = useState<InventoryItem | null>(null);
  const [configData, setConfigData] = useState<AlertConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(false);

  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);

  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [newStock, setNewStock] = useState('');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(0);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchTerm]);

  useEffect(() => {
    void loadInventory();
  }, [page, debouncedSearch]);

  useEffect(() => {
    if (!showAiScanner) {
      setCountQueue([]);
      setCountQueueMessage(null);
    }
  }, [showAiScanner]);

  const loadInventory = async () => {
    try {
      setLoading(true);
      const response = await inventoryApi.getInventory(page, 20, debouncedSearch || undefined);
      const data = response as PageResponse<InventoryItem>;
      setInventory(data.content);
      setTotalPages(data.totalPages);
      setError(null);
    } catch (err) {
      setError('Error al cargar el inventario');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openModal = async (type: ModalType, item: InventoryItem) => {
    setSelectedItem(item);
    setModalType(type);
    setQuantity('');
    setReason('');
    setNewStock(item.currentStock.toString());

    if (type === 'history') {
      try {
        setModalLoading(true);
        const response = await inventoryApi.getInventoryMovements(item.productId);
        setMovements(response.content);
      } catch (err) {
        console.error('Error loading movements:', err);
      } finally {
        setModalLoading(false);
      }
    }
  };

  const openConfigModal = async (item: InventoryItem) => {
    setConfigItem(item);
    setIsConfigModalOpen(true);
    setConfigLoading(true);
    try {
      const config = await inventoryApi.getAlertConfig(item.productId);
      setConfigData(config);
    } catch {
      setConfigData({
        productId: String(item.productId),
        criticalStock: item.minStock || 0,
        minStock: item.minStock || 0,
        overstockThreshold: item.maxStock || 0,
      });
    } finally {
      setConfigLoading(false);
    }
  };

  const closeConfigModal = () => {
    setIsConfigModalOpen(false);
    setConfigItem(null);
    setConfigData(null);
  };

  const handleConfigSave = async (data: { criticalStock: number; minStock: number; overstockThreshold: number }) => {
    if (!configItem) return;
    await inventoryApi.updateAlertConfig(configItem.productId, data);
    await inventoryApi.updateStockLimits(configItem.productId, {
      minStock: data.minStock,
      maxStock: data.overstockThreshold,
    });
    await loadInventory();
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedItem(null);
    setMovements([]);
  };

  const handleEntry = async () => {
    if (!selectedItem || !quantity || !reason) return;

    try {
      setModalLoading(true);
      await inventoryApi.recordStockEntry(selectedItem.productId, {
        quantity: parseInt(quantity, 10),
        reason,
      });
      await loadInventory();
      closeModal();
    } catch {
      setError('Error al registrar entrada');
    } finally {
      setModalLoading(false);
    }
  };

  const handleExit = async () => {
    if (!selectedItem || !quantity || !reason) return;

    try {
      setModalLoading(true);
      await inventoryApi.recordStockExit(selectedItem.productId, {
        quantity: parseInt(quantity, 10),
        reason,
      });
      await loadInventory();
      closeModal();
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 422) {
        setError('Stock insuficiente para esta salida');
      } else {
        setError('Error al registrar salida');
      }
    } finally {
      setModalLoading(false);
    }
  };

  const handleAdjustment = async () => {
    if (!selectedItem || !newStock || !reason) return;

    try {
      setModalLoading(true);
      await inventoryApi.recordStockAdjustment(selectedItem.productId, {
        newStock: parseInt(newStock, 10),
        reason,
      });
      await loadInventory();
      closeModal();
    } catch {
      setError('Error al ajustar stock');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDetectionConfirmed = ({ productId, productName }: { productId: number; productName: string }) => {
    setCountQueue((prev) => {
      const existing = prev.find((item) => item.productId === productId);
      if (existing) {
        setCountQueueMessage(`Cantidad actualizada: ${productName}`);
        return prev.map((item) =>
          item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      setCountQueueMessage(`Producto agregado: ${productName}`);
      return [...prev, { productId, productName, quantity: 1 }];
    });
  };

  const handleUpdateQueueQuantity = (productId: number, quantityValue: number) => {
    const safeQuantity = Number.isFinite(quantityValue) && quantityValue > 0 ? Math.floor(quantityValue) : 1;
    setCountQueue((prev) =>
      prev.map((item) => (item.productId === productId ? { ...item, quantity: safeQuantity } : item))
    );
  };

  const handleApplyCountQueue = async () => {
    if (countQueue.length === 0) return;
    setIsApplyingCountQueue(true);
    setCountQueueMessage('Aplicando movimientos de inventario...');

    const results = await Promise.allSettled(
      countQueue.map((item) =>
        inventoryApi.recordStockEntry(item.productId, {
          quantity: item.quantity,
          reason: 'Conteo IA',
        })
      )
    );

    const failed = results.filter((result) => result.status === 'rejected').length;
    if (failed > 0) {
      setCountQueueMessage(`${countQueue.length - failed} aplicados, ${failed} fallaron.`);
    } else {
      setCountQueueMessage('Conteo aplicado exitosamente.');
      setCountQueue([]);
    }

    await loadInventory();
    setIsApplyingCountQueue(false);
  };

  const getStockStatus = (item: InventoryItem) => {
    const minStock = typeof item.minStock === 'number' ? item.minStock : 0;
    const hasMaxStock = typeof item.maxStock === 'number' && item.maxStock > 0;

    if (item.currentStock <= 0) return { badgeClass: 'badge-critical', text: 'Sin stock' };
    if (item.currentStock <= minStock) return { badgeClass: 'badge-warning', text: 'Stock bajo' };
    if (hasMaxStock && item.currentStock >= item.maxStock) return { badgeClass: 'badge-info', text: 'Stock alto' };
    return { badgeClass: 'badge-success', text: 'Normal' };
  };

  const formatStockLimits = (item: InventoryItem) => {
    const minStock = typeof item.minStock === 'number' ? item.minStock : 0;
    const maxStockLabel = typeof item.maxStock === 'number' && item.maxStock > 0 ? item.maxStock : 'Sin maximo';
    return `${minStock} / ${maxStockLabel}`;
  };

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Inventario</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Gestion de stock y movimientos</p>
        </div>

        <div className="flex gap-3 w-full sm:w-auto">
          {!showAiScanner ? (
            <>
              <div className="w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Buscar producto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-base"
                />
              </div>
              <button onClick={() => setShowAiScanner(true)} className="btn-primary flex flex-row items-center gap-2 whitespace-nowrap">
                <Camera className="w-4 h-4" /> Conteo IA
              </button>
            </>
          ) : (
            <button onClick={() => setShowAiScanner(false)} className="btn-secondary flex flex-row items-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Volver al Inventario
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 card border-[var(--critical-red)]" style={{ backgroundColor: 'rgba(239, 68, 68, 0.05)', borderWidth: '1px', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
          <p className="text-sm font-medium" style={{ color: 'var(--critical-red)' }}>{error}</p>
          <button onClick={() => setError(null)} className="text-sm underline mt-1" style={{ color: 'var(--critical-red)' }}>
            Cerrar
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-12 w-12" style={{ borderColor: 'rgba(3, 142, 87, 0.2)', borderTopColor: 'var(--primary-base)', borderWidth: '3px' }} />
            <span className="text-sm font-medium tracking-wide" style={{ color: 'var(--text-tertiary)' }}>CARGANDO...</span>
          </div>
        </div>
      ) : showAiScanner ? (
        <div className="card p-6 max-w-4xl mx-auto">
          <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Conteo de Inventario por IA</h2>
          <AiScannerContainer useCase="inventory-count" onDetectionConfirmed={handleDetectionConfirmed} />
          <AiCountQueue
            queue={countQueue}
            isApplying={isApplyingCountQueue}
            applyMessage={countQueueMessage}
            onUpdateQuantity={handleUpdateQueueQuantity}
            onRemove={(productId) => setCountQueue((prev) => prev.filter((item) => item.productId !== productId))}
            onApply={handleApplyCountQueue}
            onClear={() => {
              setCountQueue([]);
              setCountQueueMessage(null);
            }}
          />
        </div>
      ) : (
        <>
          <div className="table-container bg-[var(--surface-secondary)]">
            <table className="min-w-full">
              <thead style={{ backgroundColor: 'var(--surface-tertiary)' }}>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Producto</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Stock Actual</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Min / Max</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Estado</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border-light)' }}>
                {inventory.map((item) => {
                  const status = getStockStatus(item);
                  return (
                    <tr key={item.id} className="hover:bg-[rgba(3,142,87,0.02)] transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{item.productName}</div>
                        <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>ID: {item.productId}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-lg font-semibold tabular-data" style={{ color: 'var(--text-primary)' }}>{item.currentStock}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm" style={{ color: 'var(--text-secondary)' }}>{formatStockLimits(item)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`badge ${status.badgeClass}`}>{status.text}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex justify-center gap-2 flex-wrap">
                          <button onClick={() => openModal('entry', item)} className="btn-action btn-action-entry" title="Entrada">+ Entrada</button>
                          <button onClick={() => openModal('exit', item)} className="btn-action btn-action-exit" title="Salida">- Salida</button>
                          <button onClick={() => openModal('adjustment', item)} className="btn-action btn-action-adjust" title="Ajuste">Ajustar</button>
                          <button onClick={() => openModal('history', item)} className="btn-action btn-action-history" title="Historial">Historial</button>
                          <button onClick={() => void openConfigModal(item)} className="btn-action" title="Configurar">Configurar</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {inventory.length === 0 && (
              <div className="p-8 text-center" style={{ color: 'var(--text-tertiary)' }}>No se encontraron productos en el inventario</div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="btn-secondary px-4 py-2">Anterior</button>
              <span className="px-4 py-2 font-medium" style={{ color: 'var(--text-secondary)' }}>Pagina {page + 1} de {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="btn-secondary px-4 py-2">Siguiente</button>
            </div>
          )}
        </>
      )}

      <StockMovementModal
        isOpen={modalType === 'entry' || modalType === 'exit' || modalType === 'adjustment'}
        type={modalType === 'history' ? null : modalType}
        item={selectedItem}
        quantity={quantity}
        reason={reason}
        newStock={newStock}
        loading={modalLoading}
        onClose={closeModal}
        onQuantityChange={setQuantity}
        onReasonChange={setReason}
        onNewStockChange={setNewStock}
        onSubmit={modalType === 'entry' ? handleEntry : modalType === 'exit' ? handleExit : handleAdjustment}
      />
      <MovementHistoryModal isOpen={modalType === 'history'} item={selectedItem} loading={modalLoading} movements={movements} onClose={closeModal} />

      {isConfigModalOpen && configItem && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-2xl p-6 relative">
            <button onClick={closeConfigModal} className="absolute right-4 top-4 text-[var(--text-secondary)]" aria-label="Cerrar modal de configuracion">
              <X className="w-5 h-5" />
            </button>
            {configLoading || !configData ? (
              <div className="py-10 text-center text-sm text-[var(--text-secondary)]">Cargando configuracion...</div>
            ) : (
              <AlertConfigForm
                productId={configItem.productId}
                productName={configItem.productName}
                initialConfig={configData}
                onSave={handleConfigSave}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
