import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { InventoryItem } from '../../api/inventory';

type StockMovementType = 'entry' | 'exit' | 'adjustment';

export type StockMovementFormValues = {
  quantity?: string;
  reason: string;
  newStock?: string;
};

const baseStockMovementSchema = z.object({
  quantity: z.string().optional(),
  reason: z.string().min(1, 'Razon requerida').max(500, 'Maximo 500 caracteres'),
  newStock: z.string().optional(),
});

interface StockMovementModalProps {
  isOpen: boolean;
  type: StockMovementType | null;
  item: InventoryItem | null;
  loading: boolean;
  onClose: () => void;
  onSubmit: (values: StockMovementFormValues) => void;
}

/** Permite solo dígitos enteros positivos (sin e, -, ., espacios). */
const onlyDigits = (value: string) => value.replace(/[^0-9]/g, '');

export function StockMovementModal({
  isOpen,
  type,
  item,
  loading,
  onClose,
  onSubmit,
}: StockMovementModalProps) {
  const stockMovementSchema = useMemo(() => {
    return baseStockMovementSchema.superRefine((data, ctx) => {
      if (type === 'entry' || type === 'exit') {
        const quantityValue = data.quantity ?? '';
        const parsed = parseInt(quantityValue, 10);

        if (!quantityValue) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['quantity'],
            message: 'Cantidad requerida',
          });
        } else if (!Number.isFinite(parsed) || parsed <= 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['quantity'],
            message: 'Debe ser mayor a 0',
          });
        }
      }

      if (type === 'adjustment') {
        const stockValue = data.newStock ?? '';
        const parsed = parseInt(stockValue, 10);

        if (!stockValue) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['newStock'],
            message: 'Nuevo stock requerido',
          });
        } else if (!Number.isFinite(parsed) || parsed < 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['newStock'],
            message: 'Debe ser 0 o mayor',
          });
        }
      }
    });
  }, [type]);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
  } = useForm<StockMovementFormValues>({
    resolver: zodResolver(stockMovementSchema),
    mode: 'onChange',
    defaultValues: {
      quantity: '',
      reason: '',
      newStock: type === 'adjustment' && item ? item.currentStock.toString() : '',
    },
  });

  useEffect(() => {
    if (!isOpen || !type || !item) return;
    reset({
      quantity: '',
      reason: '',
      newStock: type === 'adjustment' ? item.currentStock.toString() : '',
    });
  }, [isOpen, type, item, reset]);

  const quantityRegister = register('quantity', {
    onChange: (event) => {
      event.target.value = onlyDigits(event.target.value);
    },
  });

  const newStockRegister = register('newStock', {
    onChange: (event) => {
      event.target.value = onlyDigits(event.target.value);
    },
  });

  const submitForm = handleSubmit((data) => {
    onSubmit({
      quantity: data.quantity ?? '',
      reason: data.reason,
      newStock: data.newStock ?? '',
    });
  });

  const isEntry = type === 'entry';
  const isExit = type === 'exit';
  const isAdjustment = type === 'adjustment';

  if (!isOpen || !type || !item) return null;

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
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  {...quantityRegister}
                  className="input-base"
                  placeholder="Cantidad a agregar"
                  maxLength={7}
                />
                {errors.quantity && (
                  <p className="mt-1 text-xs text-red-500">{errors.quantity.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Razón</label>
                <input
                  type="text"
                  {...register('reason')}
                  className="input-base"
                  placeholder="Ej: Compra a proveedor"
                  maxLength={500}
                />
                {errors.reason && (
                  <p className="mt-1 text-xs text-red-500">{errors.reason.message}</p>
                )}
              </div>
              <button
                onClick={submitForm}
                disabled={loading || !isValid}
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
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  {...quantityRegister}
                  className="input-base"
                  placeholder="Cantidad a retirar"
                  maxLength={7}
                />
                {errors.quantity && (
                  <p className="mt-1 text-xs text-red-500">{errors.quantity.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Razón</label>
                <input
                  type="text"
                  {...register('reason')}
                  className="input-base"
                  placeholder="Ej: Merma, devolución"
                  maxLength={500}
                />
                {errors.reason && (
                  <p className="mt-1 text-xs text-red-500">{errors.reason.message}</p>
                )}
              </div>
              <button
                onClick={submitForm}
                disabled={loading || !isValid}
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
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  {...newStockRegister}
                  className="input-base"
                  placeholder="Nueva cantidad total"
                  maxLength={7}
                />
                {errors.newStock && (
                  <p className="mt-1 text-xs text-red-500">{errors.newStock.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Razón del ajuste</label>
                <input
                  type="text"
                  {...register('reason')}
                  className="input-base"
                  placeholder="Ej: Conteo físico, corrección"
                  maxLength={500}
                />
                {errors.reason && (
                  <p className="mt-1 text-xs text-red-500">{errors.reason.message}</p>
                )}
              </div>
              <button
                onClick={submitForm}
                disabled={loading || !isValid}
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
