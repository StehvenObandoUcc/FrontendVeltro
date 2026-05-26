import React, { useState, useRef, useEffect } from 'react';
import { COLOMBIAN_BANKS } from '../../utils/validationRules';
import { useCartStore } from '../../stores/cartStore';
import type { CreateSaleRequest } from '../../api/pos';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { formatCurrency } from '../../utils/formatCurrency';

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
  const items = useCartStore((s) => s.items);
  const getTotal = useCartStore((s) => s.getTotal);
  const [paymentMethod, setPaymentMethod] = useState<
    'CASH' | 'CARD' | 'NEQUI' | 'DAVIPLATA' | 'TRANSFER' | 'MIXED'
  >('CASH');
  const [notes, setNotes] = useState('');
  const [amountReceived, setAmountReceived] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Payment characteristics states
  const [cardDigits, setCardDigits] = useState('');
  const [cardType, setCardType] = useState('VISA');
  const [bankName, setBankName] = useState('BCP');
  const [operationCode, setOperationCode] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // Mixed payment states
  const [mixedCashAmount, setMixedCashAmount] = useState('');
  const [mixedOtherAmount, setMixedOtherAmount] = useState('');
  const [mixedMethod, setMixedMethod] = useState<'CARD' | 'TRANSFER' | 'NEQUI' | 'DAVIPLATA'>('NEQUI');

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
      setAmountReceived('');
      setCardDigits('');
      setCardType('VISA');
      setBankName('BANCOLOMBIA');
      setOperationCode('');
      setPhoneNumber('');
      setMixedCashAmount('');
      setMixedOtherAmount('');
      setMixedMethod('NEQUI');
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    try {
      setError(null);

      if (items.length === 0) {
        setError('El carrito está vacío');
        return;
      }

      let paymentDetailsStr = '';
      if (paymentMethod === 'CASH') {
        if (!amountReceived) {
          setError('El monto recibido es obligatorio para pagos en efectivo');
          return;
        }
        const receivedVal = parseFloat(amountReceived);
        if (isNaN(receivedVal) || receivedVal < parseFloat(total)) {
          setError('El monto recibido debe ser mayor o igual al total de la venta');
          return;
        }
        if (receivedVal > 999999999) {
          setError('El monto recibido no puede exceder 999.999.999');
          return;
        }
      } else if (paymentMethod === 'CARD') {
        if (!cardDigits) {
          setError('Los últimos 4 dígitos de la tarjeta son obligatorios');
          return;
        }
        if (cardDigits.length !== 4 || isNaN(parseInt(cardDigits))) {
          setError('Los dígitos de la tarjeta deben ser exactamente 4 números');
          return;
        }
        paymentDetailsStr = `Tarjeta: ${cardType} terminada en ${cardDigits}`;
      } else if (paymentMethod === 'TRANSFER') {
        if (!operationCode) {
          setError('El código de operación es obligatorio');
          return;
        }
        paymentDetailsStr = `Transferencia Bancaria: ${bankName} | Op: ${operationCode}`;
      } else if (paymentMethod === 'NEQUI') {
        if (!operationCode) {
          setError('El código de operación es obligatorio');
          return;
        }
        paymentDetailsStr = `Nequi: ${phoneNumber ? 'Cel: ' + phoneNumber : ''} | Op: ${operationCode}`;
      } else if (paymentMethod === 'DAVIPLATA') {
        if (!operationCode) {
          setError('El código de operación es obligatorio');
          return;
        }
        paymentDetailsStr = `Daviplata: ${phoneNumber ? 'Cel: ' + phoneNumber : ''} | Op: ${operationCode}`;
      } else if (paymentMethod === 'MIXED') {
        const cashVal = parseFloat(mixedCashAmount);
        const otherVal = parseFloat(mixedOtherAmount);
        if (isNaN(cashVal) || cashVal < 0) {
          setError('El monto en efectivo debe ser un número no negativo');
          return;
        }
        if (cashVal > 999999999) {
          setError('El monto en efectivo no puede exceder 999.999.999');
          return;
        }
        if (isNaN(otherVal) || otherVal < 0) {
          setError('El monto del otro método debe ser un número no negativo');
          return;
        }
        if (Math.abs(cashVal + otherVal - parseFloat(total)) > 0.01) {
          setError(`La suma de los montos (${formatCurrency(cashVal + otherVal)}) debe coincidir con el total (${formatCurrency(total)})`);
          return;
        }

        let mixedDetails = '';
        if (mixedMethod === 'CARD') {
          if (!cardDigits) {
            setError('Los últimos 4 dígitos de la tarjeta son obligatorios');
            return;
          }
          if (cardDigits.length !== 4 || isNaN(parseInt(cardDigits))) {
            setError('Los dígitos de la tarjeta deben ser exactamente 4 números');
            return;
          }
          mixedDetails = `Tarjeta ${cardType} (dígitos: ${cardDigits})`;
        } else if (mixedMethod === 'TRANSFER') {
          if (!operationCode) {
            setError('El código de operación es obligatorio');
            return;
          }
          mixedDetails = `Transferencia ${bankName} (Op: ${operationCode})`;
        } else if (mixedMethod === 'NEQUI') {
          if (!operationCode) {
            setError('El código de operación es obligatorio');
            return;
          }
          mixedDetails = `Nequi${phoneNumber ? ' Cel: ' + phoneNumber : ''} (Op: ${operationCode})`;
        } else if (mixedMethod === 'DAVIPLATA') {
          if (!operationCode) {
            setError('El código de operación es obligatorio');
            return;
          }
          mixedDetails = `Daviplata${phoneNumber ? ' Cel: ' + phoneNumber : ''} (Op: ${operationCode})`;
        }
        paymentDetailsStr = `Pago Mixto - Efectivo: ${formatCurrency(cashVal)} + ${mixedMethod}: ${formatCurrency(otherVal)} (${mixedDetails})`;
      }

      const finalNotes = notes
        ? `${notes}\nDetalle de Pago: ${paymentDetailsStr}`
        : paymentDetailsStr
        ? `Detalle de Pago: ${paymentDetailsStr}`
        : undefined;

      const saleData: CreateSaleRequest = {
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        paymentMethod,
        notes: finalNotes,
        amountReceived: paymentMethod === 'CASH' ? parseFloat(amountReceived) : undefined,
      };

      await onConfirm(saleData);
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : 'Error al confirmar la venta';
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
        className="mx-4 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white shadow-xl"
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
            <h3 className="mb-2 text-sm font-semibold">Productos a vender:</h3>
            <ul className="space-y-1 text-sm text-gray-700" aria-label="Productos en el carrito">
              {items.map((item) => (
                <li key={item.productId} className="flex justify-between">
                  <span>{item.product.name}</span>
                  <span
                    className="font-medium"
                    aria-label={`${item.quantity} productos a ${formatCurrency(item.product.salePrice)} cada uno`}
                  >
                    {item.quantity}x {formatCurrency(item.product.salePrice)}
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
                aria-label={`Total de la venta: ${formatCurrency(total)}`}
              >
                {formatCurrency(total)}
              </span>
            </div>
          </div>

          <div>
            <label
              htmlFor="payment-method"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Método de pago
            </label>
            <select
              id="payment-method"
              value={paymentMethod}
              onChange={(e) =>
                setPaymentMethod(
                  e.target.value as 'CASH' | 'CARD' | 'NEQUI' | 'DAVIPLATA' | 'TRANSFER' | 'MIXED'
                )
              }
              className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              aria-label="Seleccione el método de pago para la transacción"
              title="Método de pago disponible"
            >
              <option value="CASH">Efectivo</option>
              <option value="CARD">Tarjeta débito/crédito</option>
              <option value="TRANSFER">Transferencia bancaria</option>
              <option value="NEQUI">Nequi</option>
              <option value="DAVIPLATA">Daviplata</option>
              <option value="MIXED">Mixto</option>
            </select>
          </div>

          {paymentMethod === 'CASH' && (
            <div className="space-y-2 border-l-4 border-blue-500 bg-blue-50/50 p-3 rounded-r-md">
              <label
                htmlFor="amount-received"
                className="block text-sm font-semibold text-gray-700 text-left"
              >
                Efectivo recibido (obligatorio)
              </label>
              <input
                id="amount-received"
                type="number"
                step="any"
                min={total}
                value={amountReceived}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.length <= 10) {
                    setAmountReceived(val);
                  }
                }}
                placeholder={`Ej: ${parseFloat(total).toFixed(0)}`}
                className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none text-sm"
                aria-label="Ingrese el monto recibido en efectivo del cliente"
                title="Monto recibido en efectivo"
                required
              />
              {amountReceived && parseFloat(amountReceived) >= parseFloat(total) && (
                <p className="mt-1 text-sm font-semibold text-green-600 text-left">
                  Vuelto (Cambio): {formatCurrency(parseFloat(amountReceived) - parseFloat(total))}
                </p>
              )}
            </div>
          )}

          {paymentMethod === 'CARD' && (
            <div className="space-y-3 border-l-4 border-purple-500 bg-purple-50/30 p-4 rounded-r-md text-left">
              <h4 className="text-sm font-bold text-purple-800">Detalles de Tarjeta</h4>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Franquicia / Tipo de Tarjeta</label>
                <select
                  value={cardType}
                  onChange={(e) => setCardType(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none bg-white"
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
                  className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
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
                  className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none bg-white"
                >
                {COLOMBIAN_BANKS.map((bank) => (
                  <option key={bank.value} value={bank.value}>{bank.label}</option>
                ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Código de Referencia / Operación</label>
                <input
                  type="text"
                  maxLength={50}
                  value={operationCode}
                  onChange={(e) => setOperationCode(e.target.value)}
                  placeholder="Ej: TXN-98765"
                  className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
            </div>
          )}

          {paymentMethod === 'NEQUI' && (
            <div className="space-y-3 border-l-4 border-[#3F0E60] bg-[#3F0E60]/5 p-4 rounded-r-md text-left">
              <h4 className="text-sm font-bold text-[#3F0E60]">Detalles de Pago Nequi</h4>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Número de Celular Nequi (10 dígitos)</label>
                <input
                  type="text"
                  maxLength={10}
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="Ej: 3001234567"
                  className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-[#3F0E60] focus:ring-1 focus:ring-[#3F0E60]/30 focus:outline-none text-gray-800"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Código de Referencia / Operación MTI (obligatorio)</label>
                <input
                  type="text"
                  maxLength={50}
                  value={operationCode}
                  onChange={(e) => setOperationCode(e.target.value)}
                  placeholder="Ej: 123456"
                  className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-[#3F0E60] focus:ring-1 focus:ring-[#3F0E60]/30 focus:outline-none text-gray-800"
                  required
                />
              </div>
            </div>
          )}

          {paymentMethod === 'DAVIPLATA' && (
            <div className="space-y-3 border-l-4 border-[#E21F26] bg-[#E21F26]/5 p-4 rounded-r-md text-left">
              <h4 className="text-sm font-bold text-[#E21F26]">Detalles de Pago Daviplata</h4>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Número de Celular Daviplata (10 dígitos)</label>
                <input
                  type="text"
                  maxLength={10}
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="Ej: 3151234567"
                  className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-[#E21F26] focus:ring-1 focus:ring-[#E21F26]/30 focus:outline-none text-gray-800"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Código de Aprobación de 6 dígitos (obligatorio)</label>
                <input
                  type="text"
                  maxLength={6}
                  value={operationCode}
                  onChange={(e) => setOperationCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="Ej: 987654"
                  className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-[#E21F26] focus:ring-1 focus:ring-[#E21F26]/30 focus:outline-none text-gray-800"
                  required
                />
              </div>
            </div>
          )}

          {paymentMethod === 'MIXED' && (
            <div className="space-y-4 border-l-4 border-yellow-500 bg-yellow-50/30 p-4 rounded-r-md text-left">
              <h4 className="text-sm font-bold text-yellow-800">Pago Mixto</h4>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">Efectivo recibido</label>
                  <input
                    type="number"
                    step="any"
                    value={mixedCashAmount}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.length <= 10) {
                        setMixedCashAmount(val);
                        const cash = parseFloat(val) || 0;
                        const rest = Math.max(0, parseFloat(total) - cash);
                        setMixedOtherAmount(rest.toFixed(2));
                      }
                    }}
                    placeholder="Monto"
                    className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">Segundo método</label>
                  <select
                    value={mixedMethod}
                    onChange={(e) => setMixedMethod(e.target.value as 'CARD' | 'TRANSFER' | 'NEQUI' | 'DAVIPLATA')}
                    className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none bg-white text-gray-800"
                  >
              <option value="NEQUI">Nequi</option>
                    <option value="DAVIPLATA">Daviplata</option>
                    <option value="CARD">Tarjeta</option>
                    <option value="TRANSFER">Transferencia</option>
                  </select>
                </div>
              </div>

              <div className="bg-white p-3 rounded border border-yellow-200">
                <span className="text-xs font-semibold text-gray-500 block mb-0.5">
                  Monto en {mixedMethod === 'CARD' ? 'Tarjeta' : mixedMethod === 'TRANSFER' ? 'Transferencia' : mixedMethod}:
                </span>
                <span className="text-lg font-bold text-yellow-600">{formatCurrency(mixedOtherAmount || '0')}</span>
              </div>

              {/* Sub-inputs conditional for the second mixed method */}
              <div className="pt-2 border-t border-yellow-200 space-y-3">
                {mixedMethod === 'CARD' && (
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-600">Franquicia de Tarjeta</label>
                      <select
                        value={cardType}
                        onChange={(e) => setCardType(e.target.value)}
                        className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none bg-white"
                      >
                        <option value="VISA">Visa</option>
                        <option value="MASTERCARD">Mastercard</option>
                        <option value="AMEX">American Express</option>
                        <option value="OTROS">Otros</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-600">Últimos 4 dígitos</label>
                      <input
                        type="text"
                        maxLength={4}
                        value={cardDigits}
                        onChange={(e) => setCardDigits(e.target.value.replace(/\D/g, ''))}
                        placeholder="Ej: 1234"
                        className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                        required
                      />
                    </div>
                  </div>
                )}

                {mixedMethod === 'TRANSFER' && (
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-600">Banco de Destino</label>
                      <select
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none bg-white"
                      >
                        {COLOMBIAN_BANKS.map((bank) => (
                          <option key={bank.value} value={bank.value}>{bank.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-600">Código de Referencia / Operación</label>
                      <input
                        type="text"
                        maxLength={50}
                        value={operationCode}
                        onChange={(e) => setOperationCode(e.target.value)}
                        placeholder="Ej: Op-12345"
                        className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                        required
                      />
                    </div>
                  </div>
                )}

                {mixedMethod === 'NEQUI' && (
                  <div className="space-y-3 border-l-2 border-[#3F0E60] pl-3 text-left">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-600">Celular Nequi (10 dígitos)</label>
                      <input
                        type="text"
                        maxLength={10}
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                        placeholder="Ej: 3001234567"
                        className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-[#3F0E60] focus:outline-none text-gray-800"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-600">Código de Operación MTI</label>
                      <input
                        type="text"
                        value={operationCode}
                        onChange={(e) => setOperationCode(e.target.value)}
                        placeholder="Ej: 123456"
                        className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-[#3F0E60] focus:outline-none text-gray-800"
                        required
                      />
                    </div>
                  </div>
                )}

                {mixedMethod === 'DAVIPLATA' && (
                  <div className="space-y-3 border-l-2 border-[#E21F26] pl-3 text-left">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-600">Celular Daviplata (10 dígitos)</label>
                      <input
                        type="text"
                        maxLength={10}
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                        placeholder="Ej: 3151234567"
                        className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-[#E21F26] focus:outline-none text-gray-800"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-600">Código de Aprobación (6 dígitos)</label>
                      <input
                        type="text"
                        maxLength={6}
                        value={operationCode}
                        onChange={(e) => setOperationCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="Ej: 987654"
                        className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-[#E21F26] focus:outline-none text-gray-800"
                        required
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

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
              placeholder="Ej: Cliente solicitó embalaje especial"
              maxLength={200}
              className="w-full resize-none rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              rows={2}
              aria-label="Agregar notas opcionales para esta venta"
              title="Ingrese notas o instrucciones especiales para esta transacción"
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
            aria-label="Cancelar confirmación de venta y cerrar diálogo"
            title="Cerrar este diálogo (Tecla Escape)"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading || items.length === 0}
            className="flex-1 rounded bg-green-600 px-4 py-2 font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={`Confirmar y procesar venta de ${formatCurrency(total)}`}
            title="Completar esta transacción"
          >
            {isLoading ? 'Procesando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
};
