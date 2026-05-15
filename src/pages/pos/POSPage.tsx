import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AxiosError } from 'axios';
import { Search, ShoppingCart, ArrowLeft, Check, Trash2 } from 'lucide-react';
import { ScannerContainer, CartTable, ConfirmModal, SaleReceipt } from '../../components/pos';
import { ScanModeToggle } from '../../components/pos/ScanModeToggle';
import { AiScannerContainer } from '../../components/pos/AiScannerContainer';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useCartStore } from '../../stores/cartStore';
import { useAiScanStore } from '../../stores/aiScanStore';
import { posApi, type SaleResponse, type CreateSaleRequest } from '../../api/pos';
import type { ApiError } from '../../types';
import { formatCurrency } from '../../utils/formatCurrency';

export const POSPage: React.FC = () => {
  const navigate = useNavigate();
  const items = useCartStore((s) => s.items);
  const clear = useCartStore((s) => s.clear);
  const getTotal = useCartStore((s) => s.getTotal);
  const getItemCount = useCartStore((s) => s.getItemCount);
  const { scanMode } = useAiScanStore();

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [saleResponse, setSaleResponse] = useState<SaleResponse | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirmSale = async (saleData: CreateSaleRequest) => {
    try {
      setIsProcessing(true);
      setError(null);

      const response = await posApi.quickSale(saleData);
      setSaleResponse(response);
      setShowReceipt(true);
      setShowConfirmModal(false);
      clear();
    } catch (err) {
      const axiosError = err as AxiosError<ApiError>;
      let errorMsg = 'Error al confirmar la venta';
      if (axiosError.response) {
        if (axiosError.response.status === 422) {
          errorMsg = axiosError.response.data?.message || 'No se puede confirmar la venta por stock insuficiente en uno o mas productos.';
        } else if (axiosError.response.status === 500) {
          errorMsg = 'Error interno del servidor al procesar la venta. Intente nuevamente.';
        } else {
          errorMsg = axiosError.response.data?.message || errorMsg;
        }
      } else if (axiosError.request) {
        errorMsg = 'Error de red. No se pudo establecer conexión con el servidor.';
      } else {
        errorMsg = err instanceof Error ? err.message : errorMsg;
      }
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearCart = () => {
    setShowClearConfirm(true);
  };

  const confirmClearCart = () => {
    clear();
    setError(null);
    setShowClearConfirm(false);
  };

  const handleReceiptClose = () => {
    setShowReceipt(false);
    setSaleResponse(null);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Punto de Venta (POS)</h1>
          <p className="mt-1 text-[var(--text-secondary)] text-sm">
            Escanea o busca productos para agregar al carrito
          </p>
        </div>
        <button
          onClick={() => navigate('/')}
          className="btn-secondary flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Volver
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 shadow-sm">
          <p className="font-semibold text-sm">Error al procesar venta</p>
          <p className="text-sm mt-0.5">{error}</p>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Scanner Section (2/3 on desktop) */}
        <div className="lg:col-span-2">
          <div className="card p-4 sm:p-6 h-full">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Search className="w-5 h-5 text-[var(--primary-base)]" /> Agregar Productos
              </h2>
              {/* Scan Mode Toggle */}
              <ScanModeToggle />
            </div>
            
            {/* Conditional Scanner - Barcode vs AI */}
            {scanMode === 'barcode' ? (
              <ScannerContainer />
            ) : (
              <AiScannerContainer useCase="pos-sell" />
            )}
          </div>
        </div>

        {/* Cart Section (1/3 on desktop, compact on mobile) */}
        <div className="lg:col-span-1">
          <div className="card overflow-hidden flex flex-col max-h-[70vh] lg:max-h-none lg:h-full">
            <div className="bg-[var(--surface-tertiary)] border-b border-[var(--border-light)] px-4 sm:px-6 py-3 sm:py-4">
              <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)] flex items-center justify-between">
                <span className="flex items-center gap-2"><ShoppingCart className="w-5 h-5" /> Carrito</span>
                <span className="bg-[var(--primary-base)] text-white text-xs px-2.5 py-1 rounded-full">
                  {getItemCount()} items
                </span>
              </h2>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden p-3 sm:p-4 min-h-0">
              <CartTable />
            </div>

            {/* Action Buttons */}
            <div className="bg-[var(--surface-inset)] p-4 sm:p-5 space-y-2 sm:space-y-3 border-t border-[var(--border-light)]">
              <div className="flex justify-between items-center mb-3 pb-3 border-b border-[var(--border-light)]">
                <span className="text-[var(--text-secondary)] font-medium text-sm">Total</span>
                <span className="text-xl sm:text-2xl font-bold tabular-data text-[var(--primary-base)]">
                  {formatCurrency(getTotal())}
                </span>
              </div>
              <button
                onClick={() => {
                  setError(null);
                  setShowConfirmModal(true);
                }}
                disabled={items.length === 0 || isProcessing}
                className="btn-primary w-full py-2.5 sm:py-3 text-sm sm:text-base flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" /> Confirmar Venta
              </button>

              <button
                onClick={handleClearCart}
                disabled={items.length === 0 || isProcessing}
                className="btn-secondary w-full py-2 sm:py-2.5 text-sm flex items-center justify-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-transparent hover:border-red-200"
              >
                <Trash2 className="w-4 h-4" /> Vaciar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false);
          setError(null);
        }}
        onConfirm={handleConfirmSale}
        isLoading={isProcessing}
        submitError={error}
      />
      <SaleReceipt
        isOpen={showReceipt}
        saleData={saleResponse}
        onClose={handleReceiptClose}
      />
      <ConfirmDialog
        isOpen={showClearConfirm}
        title="Vaciar carrito"
        message="¿Estás seguro de que deseas vaciar el carrito?"
        confirmLabel="Vaciar"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={confirmClearCart}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  );
};
