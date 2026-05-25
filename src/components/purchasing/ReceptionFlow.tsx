import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { purchasingApi } from '../../api/purchasing';

interface ReceptionFlowProps {
  orderId: number;
  onReceived?: () => void;
  onClose?: () => void;
}

/**
 * ReceptionFlow - Modal for receiving a purchase order.
 * Backend marks the entire order as received in one call (no per-item granularity).
 */
export const ReceptionFlow: React.FC<ReceptionFlowProps> = ({
  orderId,
  onReceived,
  onClose,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states matching POS payment methods
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'TRANSFER' | 'YAPE' | 'PLIN'>('CASH');
  const [notes, setNotes] = useState('');
  const [cardDigits, setCardDigits] = useState('');
  const [cardType, setCardType] = useState('VISA');
  const [bankName, setBankName] = useState('BCP');
  const [operationCode, setOperationCode] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // [C6] Scroll lock: prevent background scrolling while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // [C6] Escape key handler for accessibility
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      let paymentDetailsStr = '';

      if (paymentMethod === 'CARD') {
        if (!cardDigits) {
          setError('Los últimos 4 dígitos de la tarjeta son obligatorios');
          setIsSubmitting(false);
          return;
        }
        if (cardDigits.length !== 4 || isNaN(parseInt(cardDigits))) {
          setError('Los dígitos de la tarjeta deben ser exactamente 4 números');
          setIsSubmitting(false);
          return;
        }
        paymentDetailsStr = `Tarjeta: ${cardType} terminada en ${cardDigits}`;
      } else if (paymentMethod === 'TRANSFER') {
        if (!operationCode) {
          setError('El código de operación es obligatorio');
          setIsSubmitting(false);
          return;
        }
        paymentDetailsStr = `Transferencia Bancaria: ${bankName} | Op: ${operationCode}`;
      } else if (paymentMethod === 'YAPE') {
        if (!operationCode) {
          setError('El código de operación es obligatorio');
          setIsSubmitting(false);
          return;
        }
        paymentDetailsStr = `Yape: ${phoneNumber ? 'Cel: ' + phoneNumber : ''} | Op: ${operationCode}`;
      } else if (paymentMethod === 'PLIN') {
        if (!operationCode) {
          setError('El código de operación es obligatorio');
          setIsSubmitting(false);
          return;
        }
        paymentDetailsStr = `Plin: ${phoneNumber ? 'Cel: ' + phoneNumber : ''} | Op: ${operationCode}`;
      } else if (paymentMethod === 'CASH') {
        paymentDetailsStr = 'Efectivo';
      }

      await purchasingApi.markAsReceived(orderId, {
        paymentMethod,
        paymentDetails: paymentDetailsStr,
        notes: notes || undefined,
      });

      onReceived?.();
      onClose?.();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al registrar la recepción de la orden'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="rounded-lg max-w-md w-full mx-auto shadow-2xl flex flex-col max-h-[90vh]" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E3DB' }}>
        {/* Header */}
        <div className="px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid #E8E3DB' }}>
          <h2 className="text-xl font-bold" style={{ color: '#1F2937' }}>
            Confirmar Recepción de Compra
          </h2>
        </div>

        {/* Scrollable Content */}
        <div className="px-6 py-4 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="p-3 rounded-md text-left" style={{ backgroundColor: 'rgba(255,46,33,0.1)', border: '1px solid #FF2E21' }}>
              <p className="text-sm font-semibold" style={{ color: '#FF2E21' }}>{error}</p>
            </div>
          )}

          <p className="text-sm text-left" style={{ color: '#6B7280' }}>
            Al confirmar la recepción, se incrementará el stock del inventario para los productos de esta orden de compra y se registrará el método de pago con sus detalles correspondientes.
          </p>

          <hr style={{ borderColor: '#E8E3DB' }} />

          {/* Payment Method Selector */}
          <div>
            <label htmlFor="payment-method" className="mb-1.5 block text-sm font-semibold text-gray-700 text-left">
              Método de Pago
            </label>
            <select
              id="payment-method"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as 'CASH' | 'CARD' | 'TRANSFER' | 'YAPE' | 'PLIN')}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none bg-white text-gray-800"
            >
              <option value="CASH">Efectivo</option>
              <option value="CARD">Tarjeta</option>
              <option value="TRANSFER">Transferencia Bancaria</option>
              <option value="YAPE">Yape</option>
              <option value="PLIN">Plin</option>
            </select>
          </div>

          {/* Conditional Characteristics Inputs */}
          {paymentMethod === 'CARD' && (
            <div className="space-y-3 border-l-4 border-purple-500 bg-purple-50/30 p-4 rounded-r-md text-left">
              <h4 className="text-sm font-bold text-purple-800">Detalles de Tarjeta</h4>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Franquicia / Tipo de Tarjeta</label>
                <select
                  value={cardType}
                  onChange={(e) => setCardType(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none bg-white text-gray-800"
                >
                  <option value="VISA">Visa</option>
                  <option value="MASTERCARD">Mastercard</option>
                  <option value="AMEX">American Express</option>
                  <option value="DINERS">Diners Club</option>
                  <option value="OTROS">Otros</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Últimos 4 dígitos (obligatorio)</label>
                <input
                  type="text"
                  maxLength={4}
                  value={cardDigits}
                  onChange={(e) => setCardDigits(e.target.value.replace(/\D/g, ''))}
                  placeholder="Ej: 1234"
                  className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none text-gray-800"
                  required
                />
              </div>
            </div>
          )}

          {paymentMethod === 'TRANSFER' && (
            <div className="space-y-3 border-l-4 border-indigo-500 bg-indigo-50/30 p-4 rounded-r-md text-left">
              <h4 className="text-sm font-bold text-indigo-800">Detalles de Transferencia</h4>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Banco de Destino</label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none bg-white text-gray-800"
                >
                  <option value="BCP">Banco de Crédito (BCP)</option>
                  <option value="BBVA">BBVA</option>
                  <option value="INTERBANK">Interbank</option>
                  <option value="SCOTIABANK">Scotiabank</option>
                  <option value="BANCO_NACION">Banco de la Nación</option>
                  <option value="OTROS">Otros</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Código de Referencia / Operación (obligatorio)</label>
                <input
                  type="text"
                  value={operationCode}
                  onChange={(e) => setOperationCode(e.target.value)}
                  placeholder="Ej: TXN-98765"
                  className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none text-gray-800"
                  required
                />
              </div>
            </div>
          )}

          {(paymentMethod === 'YAPE' || paymentMethod === 'PLIN') && (
            <div className="space-y-3 border-l-4 border-pink-500 bg-pink-50/30 p-4 rounded-r-md text-left">
              <h4 className="text-sm font-bold text-pink-800">Detalles de Billetera ({paymentMethod})</h4>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Número de Celular (opcional)</label>
                <input
                  type="text"
                  maxLength={9}
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="Ej: 987654321"
                  className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none text-gray-800"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Código de Operación (obligatorio)</label>
                <input
                  type="text"
                  value={operationCode}
                  onChange={(e) => setOperationCode(e.target.value)}
                  placeholder="Ej: 123456"
                  className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none text-gray-800"
                  required
                />
              </div>
            </div>
          )}

          {/* Notes Input */}
          <div>
            <label htmlFor="reception-notes" className="mb-1.5 block text-sm font-semibold text-gray-700 text-left">
              Notas de Recepción (opcional)
            </label>
            <textarea
              id="reception-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Todos los productos llegaron en buen estado..."
              className="w-full resize-none rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none text-gray-800"
              rows={2}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex justify-end gap-3 flex-shrink-0" style={{ borderTop: '1px solid #E8E3DB', backgroundColor: '#F9F9FB' }}>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-md font-medium transition-colors text-sm"
            style={{
              backgroundColor: '#FFFFFF',
              color: '#4B5563',
              border: '1px solid #D1D5DB',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={(e) => {
              if (!isSubmitting) {
                e.currentTarget.style.backgroundColor = '#F3F4F6';
                e.currentTarget.style.color = '#1F2937';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#FFFFFF';
              e.currentTarget.style.color = '#4B5563';
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-md font-medium transition-colors text-sm text-white"
            style={{
              backgroundColor: isSubmitting ? '#93C5FD' : '#2563EB',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              border: 'none',
            }}
            onMouseEnter={(e) => {
              if (!isSubmitting) e.currentTarget.style.backgroundColor = '#1D4ED8';
            }}
            onMouseLeave={(e) => {
              if (!isSubmitting) e.currentTarget.style.backgroundColor = '#2563EB';
            }}
          >
            {isSubmitting ? 'Recibiendo...' : 'Confirmar Recepción'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
