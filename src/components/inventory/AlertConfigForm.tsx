import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import type { AlertConfig } from '../../api/inventory';

interface AlertConfigFormProps {
  productId: number;
  productName: string;
  initialConfig: AlertConfig;
  onSave: (data: { criticalStock: number; minStock: number; overstockThreshold: number }) => Promise<void>;
}

const alertConfigSchema = z.object({
  criticalStock: z.number().int().min(0, 'Debe ser 0 o mayor'),
  minStock: z.number().int().min(0, 'Debe ser 0 o mayor'),
  overstockThreshold: z.number().int().min(0, 'Debe ser 0 o mayor'),
});

type AlertConfigFormData = z.infer<typeof alertConfigSchema>;

export const AlertConfigForm: React.FC<AlertConfigFormProps> = ({
  productName,
  initialConfig,
  onSave,
}) => {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AlertConfigFormData>({
    resolver: zodResolver(alertConfigSchema),
    defaultValues: {
      criticalStock: initialConfig.criticalStock,
      minStock: initialConfig.minStock,
      overstockThreshold: initialConfig.overstockThreshold,
    },
  });

  useEffect(() => {
    reset({
      criticalStock: initialConfig.criticalStock,
      minStock: initialConfig.minStock,
      overstockThreshold: initialConfig.overstockThreshold,
    });
  }, [initialConfig, reset]);

  const onSubmit: SubmitHandler<AlertConfigFormData> = async (data) => {
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      await onSave(data);
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Error al guardar la configuracion');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <h3 className="text-lg font-medium text-[var(--text-primary)]">Configuracion de alertas para {productName}</h3>

      <div>
        <label htmlFor="criticalStock" className="text-sm font-medium text-[var(--text-primary)] block mb-1">
          Nivel critico (Alerta cuando &lt;= esta cantidad)
        </label>
        <input id="criticalStock" type="number" {...register('criticalStock', { valueAsNumber: true })} className="input-base" placeholder="0" />
        {errors.criticalStock && <p className="mt-1 text-sm text-[var(--critical-red)]">{errors.criticalStock.message}</p>}
      </div>

      <div>
        <label htmlFor="minStock" className="text-sm font-medium text-[var(--text-primary)] block mb-1">
          Nivel minimo (Advertencia cuando &lt;= esta cantidad)
        </label>
        <input id="minStock" type="number" {...register('minStock', { valueAsNumber: true })} className="input-base" placeholder="0" />
        {errors.minStock && <p className="mt-1 text-sm text-[var(--critical-red)]">{errors.minStock.message}</p>}
      </div>

      <div>
        <label htmlFor="overstockThreshold" className="text-sm font-medium text-[var(--text-primary)] block mb-1">
          Umbral de sobrestock (Alerta cuando &gt;= esta cantidad)
        </label>
        <input id="overstockThreshold" type="number" {...register('overstockThreshold', { valueAsNumber: true })} className="input-base" placeholder="0" />
        {errors.overstockThreshold && <p className="mt-1 text-sm text-[var(--critical-red)]">{errors.overstockThreshold.message}</p>}
      </div>

      {submitError && <div className="p-3 rounded-md border border-[var(--critical-red)] bg-red-50 text-sm text-[var(--critical-red)]">{submitError}</div>}
      {submitSuccess && <div className="p-3 rounded-md border border-[var(--primary-base)] bg-green-50 text-sm text-[var(--primary-dark)]">Configuracion guardada exitosamente.</div>}

      <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
        {isSubmitting ? 'Guardando...' : 'Guardar configuracion'}
      </button>
    </form>
  );
};

