import React, { useState, useRef, useEffect } from 'react';
import { useCartStore } from '../../stores/cartStore';
import type { CreateSaleRequest } from '../../api/pos';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (saleData: CreateSaleRequest) => Promise<void> | void;
  isLoading?: boolean;
  submitError?: string | null;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  submitError = null,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const { items, getTotal } = useCartStore();
  const [paymentMethod, setPaymentMethod] = useState<
    'CASH' | 'CARD' | 'NEQUI' | 'DAVIPLATA'
  >('CASH');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useFocusTrap(modalRef, onClose, isOpen);

  useEffect(() => {
    if (submitError) {
      setError(submitError);
    }
  }, [submitError]);

  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setNotes('');
      setPaymentMethod('CASH');
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    try {
      setError(null);

      if (items.length === 0) {
        setError('El carrito esta vacio');
        return;
      }

      const saleData: CreateSaleRequest = {
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        paymentMethod,
        notes: notes || undefined,
      };

      await onConfirm(saleData);
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : 'Error al confirmar venta';
      setError(errorMsg);
    }
  };

  if (!isOpen) return null;

  const total = getTotal();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      role="presentation"
    >
      <div
        ref={modalRef}
        className="mx-4 max-h-96 w-full max-w-md overflow-y-auto rounded-lg bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-description"
        tabIndex={-1}
      >
        <div className="bg-blue-600 px-6 py-4 text-white">
          <h2 id="confirm-modal-title" className="text-xl font-bold">
            Confirmar Venta
          </h2>
        </div>

        <div className="space-y-4 p-6" id="confirm-modal-description">
          <div className="rounded border bg-gray-50 p-4">
            <h3 className="mb-2 text-sm font-semibold">Items a vender:</h3>
            <ul className="space-y-1 text-sm text-gray-700" aria-label="Items in cart">
              {items.map((item) => (
                <li key={item.productId} className="flex justify-between">
                  <span>{item.product.name}</span>
                  <span
                    className="font-medium"
                    aria-label={`${item.quantity} items at $ ${parseFloat(item.product.salePrice).toFixed(2)} each`}
                  >
                    {item.quantity}x $ {parseFloat(item.product.salePrice).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded border-2 border-green-300 bg-green-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold">Total:</span>
              <span
                className="text-2xl font-bold text-green-600"
                aria-label={`Sale total: $ ${parseFloat(total).toFixed(2)}`}
              >
                $ {parseFloat(total).toFixed(2)}
              </span>
            </div>
          </div>

          <div>
            <label
              htmlFor="payment-method"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Metodo de pago
            </label>
            <select
              id="payment-method"
              value={paymentMethod}
              onChange={(e) =>
                setPaymentMethod(
                  e.target.value as 'CASH' | 'CARD' | 'NEQUI' | 'DAVIPLATA'
                )
              }
              className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              aria-label="Select payment method for transaction"
              title="Cash, Card, Nequi, or Daviplata"
            >
              <option value="CASH">Efectivo</option>
              <option value="CARD">Tarjeta</option>
              <option value="NEQUI">Nequi</option>
              <option value="DAVIPLATA">Daviplata</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="sale-notes"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Notas (opcional)
            </label>
            <textarea
              id="sale-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Cliente solicito embalaje especial"
              className="w-full resize-none rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              rows={2}
              aria-label="Add optional notes for this sale"
              title="Enter any special notes or instructions for this transaction"
            />
          </div>

          {error && (
            <div
              className="rounded border border-red-400 bg-red-100 p-3 text-sm text-red-700"
              role="alert"
              aria-live="assertive"
            >
              {error}
            </div>
          )}
        </div>

        <div className="flex space-x-3 bg-gray-50 px-6 py-4">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 rounded bg-gray-300 px-4 py-2 font-medium text-gray-800 transition hover:bg-gray-400 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Cancel sale confirmation and close dialog"
            title="Close this dialog (Escape key)"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading || items.length === 0}
            className="flex-1 rounded bg-green-600 px-4 py-2 font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={`Confirm and process sale of $ ${parseFloat(total).toFixed(2)}`}
            title="Complete this transaction"
          >
            {isLoading ? 'Procesando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
};
