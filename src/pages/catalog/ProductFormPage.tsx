import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import type { AxiosError } from 'axios';
import { Camera, AlertTriangle, CheckCircle } from 'lucide-react';
import { z } from 'zod';
import { productApi, categoryApi } from '../../api/catalog';
import { inventoryApi } from '../../api/inventory';
import { ProductScanner, type ScannedProductData } from '../../components/catalog';
import { CameraCapture } from '../../components/common/CameraCapture';
import type { Category } from '../../types';

/**
 * Schema validation reflects the overstock concept.
 * minStockInfo is maintained in the DTO for backward compatibility,
 * but acts as the overstock threshold.
 */
const productSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(200, 'Maximo 200 caracteres'),
  barcode: z
    .string()
    .max(30, 'El código de barras no puede exceder 30 caracteres')
    .regex(/^\d*$/, 'Solo se permiten dígitos')
    .optional()
    .or(z.literal('')),
  sku: z.string().max(50, 'El SKU no puede exceder 50 caracteres').optional(),
  description: z.string().max(500, 'Maximo 500 caracteres').optional(),
  costPrice: z.string().min(1, 'El precio de costo es requerido'),
  salePrice: z.string().min(1, 'El precio de venta es requerido'),
  categoryId: z.string().optional(),
  minStockInfo: z.string().optional(),
  minStockWarning: z.string().optional(),
  minStockCritical: z.string().optional(),
}).refine((data) => {
  const overstockThresholdValue = parseInt(data.minStockInfo || '0', 10) || 0;
  const warning = parseInt(data.minStockWarning || '0', 10) || 0;
  const critical = parseInt(data.minStockCritical || '0', 10) || 0;

  if (overstockThresholdValue > 0 && overstockThresholdValue <= warning) {
    return false;
  }

  return critical <= warning;
}, {
  message: 'Umbrales invalidos: Critico <= Advertencia, y Sobrestock > Advertencia',
  path: ['minStockCritical'],
});

type ProductFormData = z.infer<typeof productSchema>;
type ThresholdsPayload = {
  overstock: number;
  warning: number;
  critical: number;
};

function parseThresholdValue(value?: string): number {
  return parseInt(value || '0', 10) || 0;
}

const formatFormPrice = (price?: string | null): string => {
  if (!price) return '';
  const parsed = parseFloat(price);
  return Number.isNaN(parsed) ? '' : parsed.toFixed(2);
};

const blockInvalidChars = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (['e', 'E', '+'].includes(e.key)) e.preventDefault();
};

const blockInvalidIntegerChars = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (['e', 'E', '+', '.'].includes(e.key)) e.preventDefault();
};

async function normalizeToJpeg(file: File): Promise<File> {
  if (file.type === 'image/jpeg' || file.type === 'image/jpg') return file;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        URL.revokeObjectURL(url);
        return resolve(file);
      }

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);

        if (!blob) {
          return resolve(file);
        }

        const jpegName = file.name.replace(/\.[^.]+$/, '.jpg');
        resolve(new File([blob], jpegName, { type: 'image/jpeg' }));
      }, 'image/jpeg', 0.92);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };

    img.src = url;
  });
}

export function ProductFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);

  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isProductInactive, setIsProductInactive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingSync, setPendingSync] = useState<{
    productId: number;
    thresholds: ThresholdsPayload;
  } | null>(null);
  const [conflictError, setConflictError] = useState<{
    message: string;
    existingProductId: number | null;
  } | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const [scanWarning, setScanWarning] = useState<string | null>(null);
  const [scanSuccess, setScanSuccess] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
  });

  useEffect(() => {
    void loadCategories();

    if (isEditing && id) {
      void loadProduct(parseInt(id, 10));
    }
  }, [id, isEditing]);

  useEffect(() => {
    if (!scanWarning) return;

    const timeoutId = window.setTimeout(() => setScanWarning(null), 6000);
    return () => window.clearTimeout(timeoutId);
  }, [scanWarning]);

  useEffect(() => {
    if (!scanSuccess) return;

    const timeoutId = window.setTimeout(() => setScanSuccess(null), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [scanSuccess]);

  const loadCategories = async () => {
    try {
      const data = await categoryApi.getAll();
      setCategories(data);
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  };

  const loadProduct = async (productId: number) => {
    setIsLoading(true);

    try {
      const product = await productApi.getById(productId);
      let alertConfig: Awaited<ReturnType<typeof inventoryApi.getAlertConfig>> | null = null;

      try {
        alertConfig = await inventoryApi.getAlertConfig(productId);
      } catch (err: unknown) {
        const axiosError = err as AxiosError;
        const status = axiosError.response?.status;

        if (status === 401 || status === 403) {
          throw err;
        }

        if (status !== 404) {
          console.error('Error loading alert configuration:', err);
        }
      }

      reset({
        name: product.name,
        barcode: product.barcode || '',
        sku: product.sku || '',
        description: product.description || '',
        costPrice: formatFormPrice(product.costPrice),
        salePrice: formatFormPrice(product.salePrice),
        categoryId: product.categoryId?.toString() || '',
        minStockInfo: alertConfig?.overstockThreshold?.toString() ?? product.minStockInfo?.toString() ?? '0',
        minStockWarning: alertConfig?.minStock?.toString() ?? product.minStockWarning?.toString() ?? '0',
        minStockCritical: alertConfig?.criticalStock?.toString() ?? product.minStockCritical?.toString() ?? '0',
      });

      // V01 — detectar si el producto está desactivado y bloquear edición
      if (!product.active) {
        setIsProductInactive(true);
      }
    } catch (err) {
      setError('Error al cargar el producto');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const syncThresholds = async (productId: number, thresholds: ThresholdsPayload) => {
    try {
      // Sequential execution to prevent database transaction collisions / optimistic locking conflicts (HTTP 409)
      await inventoryApi.updateAlertConfig(productId, {
        criticalStock: thresholds.critical,
        minStock: thresholds.warning,
        overstockThreshold: thresholds.overstock,
      });

      await inventoryApi.updateStockLimits(productId, {
        minStock: thresholds.warning,
        maxStock: thresholds.overstock,
      });

      setPendingSync(null);
      return true;
    } catch (err) {
      console.error('Error syncing thresholds:', err);
      setPendingSync({ productId, thresholds });
      setError('Se guardo el producto, pero no se pudieron guardar los umbrales. Por favor, intente de nuevo.');
      return false;
    }
  };

  const handleScanResult = (data: ScannedProductData) => {
    setScanWarning(null);
    setScanSuccess(null);

    if (data.barcode) {
      setValue('barcode', data.barcode);
    }

    if (data.existsInDb) {
      setScanWarning(
        `Este producto ya existe en el sistema (ID: ${data.existingProductId}). ` +
        'Si deseas editarlo, ve a la lista de productos.'
      );

      if (!isEditing) {
        if (data.name) setValue('name', data.name);
        if (data.description) setValue('description', data.description);
        if (data.suggestedPrice) setValue('salePrice', data.suggestedPrice);
      }

      setShowScanner(false);
      return;
    }

    const filled: string[] = [];

    if (data.barcode) {
      filled.push('codigo de barras');
    }

    if (data.name) {
      setValue('name', data.name);
      filled.push('nombre');
    }

    if (data.description) {
      setValue('description', data.description);
      filled.push('descripcion');
    }

    if (data.suggestedPrice) {
      setValue('salePrice', data.suggestedPrice);
      filled.push('precio de venta');
    }

    if (data.source === 'ai' && data.confidence !== undefined) {
      const confidencePercentage = Math.round(data.confidence * 100);
      setScanSuccess(
        `IA completo: ${filled.join(', ')} (${confidencePercentage}% confianza). Verifica los datos antes de guardar.`
      );
    } else if (data.source === 'barcode-new') {
      setScanSuccess('Codigo de barras registrado. Completa los demas campos.');
    } else if (filled.length > 0) {
      setScanSuccess(`Campos completados: ${filled.join(', ')}.`);
    }

    setShowScanner(false);
  };

  const onSubmit = async (data: ProductFormData) => {
    setIsSaving(true);
    setError(null);
    setConflictError(null);

    const thresholds: ThresholdsPayload = {
      /** Backward-compatible DTO field mapped to the real overstock threshold. */
      overstock: parseThresholdValue(data.minStockInfo),
      warning: parseThresholdValue(data.minStockWarning),
      critical: parseThresholdValue(data.minStockCritical),
    };

    const productData = {
      name: data.name,
      barcode: data.barcode || undefined,
      sku: data.sku || undefined,
      description: data.description || undefined,
      costPrice: data.costPrice,
      salePrice: data.salePrice,
      categoryId: data.categoryId ? parseInt(data.categoryId, 10) : undefined,
      minStockInfo: thresholds.overstock,
      minStockWarning: thresholds.warning,
      minStockCritical: thresholds.critical,
    };

    try {
      if (pendingSync) {
        const syncSucceeded = await syncThresholds(pendingSync.productId, pendingSync.thresholds);

        if (syncSucceeded) {
          navigate('/app/catalog/products');
        }

        return;
      }

      let savedProductId = isEditing && id ? parseInt(id, 10) : null;

      if (isEditing && id) {
        await productApi.update(parseInt(id, 10), productData);
        savedProductId = parseInt(id, 10);
      } else {
        const imageFile = imageFiles[0] ? await normalizeToJpeg(imageFiles[0]) : null;
        const createdProduct = await productApi.create(productData, imageFile);
        savedProductId = createdProduct.id;
      }

      if (imageFiles.length > 0 && savedProductId && isEditing) {
        try {
          const normalizedImages = await Promise.all(imageFiles.map(normalizeToJpeg));
          await productApi.uploadImages(savedProductId, normalizedImages);
        } catch (imgErr) {
          console.error('Error uploading images:', imgErr);
        }
      }

      if (!savedProductId) {
        setError('No se pudo determinar el producto guardado para sincronizar umbrales');
        return;
      }

      const syncSucceeded = await syncThresholds(savedProductId, thresholds);

      if (syncSucceeded) {
        navigate('/app/catalog/products');
      }
    } catch (err) {
      const axiosError = err as AxiosError<{ message: string; existingId?: number; existingProductId?: number }>;
      const status = axiosError.response?.status;
      const responseData = axiosError.response?.data;

      if (status === 409) {
        const message = responseData?.message ?? '';
        const idMatch = message.match(/id[:\s]+(\d+)/i);
        const existingId =
          responseData?.existingProductId ??
          responseData?.existingId ??
          (idMatch ? parseInt(idMatch[1], 10) : null);

        setConflictError({
          message: 'Ya existe un producto con este codigo de barras o SKU.',
          existingProductId: existingId,
        });
      } else {
        setError(responseData?.message || 'Error al guardar el producto');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleRetryThresholdSync = () => {
    void handleSubmit(onSubmit)();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const files = Array.from(e.target.files);
    setImageFiles((prev) => [...prev, ...files]);

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key !== 'Enter' || e.shiftKey) return;

    const target = e.target as HTMLElement;

    if (target.tagName === 'BUTTON') return;

    const fieldOrder = [
      'name',
      'barcode',
      'sku',
      'description',
      'costPrice',
      'salePrice',
      'categoryId',
      'minStockInfo',
      'minStockWarning',
      'minStockCritical',
    ];

    const currentIndex = fieldOrder.indexOf(target.id);

    if (currentIndex !== -1 && currentIndex < fieldOrder.length - 1) {
      e.preventDefault();
      const nextId = fieldOrder[currentIndex + 1];
      const nextElement = document.getElementById(nextId);
      nextElement?.focus();
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-[var(--text-secondary)]">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
          {isEditing ? 'Editar Producto' : 'Nuevo Producto'}
        </h1>
        <p className="mt-1 text-[var(--text-secondary)] text-sm">
          {isEditing
            ? 'Actualiza los datos del producto seleccionado.'
            : 'Completa el formulario para registrar un nuevo producto en el catalogo.'}
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl mb-6 bg-red-50 border border-red-200 text-red-600 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <span>{error}</span>
            {pendingSync && (
              <button
                type="button"
                onClick={handleRetryThresholdSync}
                disabled={isSaving}
                className="px-4 py-2 rounded-lg border border-red-300 bg-white text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Reintentar guardar umbrales
              </button>
            )}
          </div>
        </div>
      )}

      {/* V01 — Banner bloqueante para productos desactivados */}
      {isProductInactive && (
        <div className="p-4 rounded-xl mb-6 flex items-start gap-3"
          style={{ backgroundColor: '#FEF3C7', border: '1px solid #F59E0B' }}>
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#D97706' }} />
          <div className="flex-1">
            <p className="font-semibold text-sm" style={{ color: '#92400E' }}>
              Producto desactivado
            </p>
            <p className="text-sm mt-1" style={{ color: '#92400E' }}>
              Este producto está inactivo y no se puede editar hasta que sea reactivado.
              Ve a la lista de productos inactivos para reactivarlo primero.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/app/catalog/products/inactive')}
            className="flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium"
            style={{ backgroundColor: '#F59E0B', color: '#fff' }}
          >
            Ver inactivos
          </button>
        </div>
      )}

      <div className="mb-6">
        {!showScanner ? (
          <button
            type="button"
            onClick={() => setShowScanner(true)}
            className="w-full py-3 px-4 rounded-xl border-2 border-dashed border-[var(--border-default)] bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:border-[var(--primary-base)] hover:text-[var(--primary-base)] transition-colors flex items-center justify-center gap-2"
          >
            <Camera className="w-5 h-5" />
            <span className="text-sm font-medium">Escanear producto con camara o IA</span>
          </button>
        ) : (
          <div className="card p-4">
            <ProductScanner onResult={handleScanResult} onClose={() => setShowScanner(false)} />
          </div>
        )}

        {scanWarning && (
          <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{scanWarning}</span>
          </div>
        )}

        {scanSuccess && (
          <div className="mt-3 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm flex items-start gap-2">
            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{scanSuccess}</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} onKeyDown={handleKeyDown} className="card p-8 space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5">
            Nombre *
          </label>
          <input
            id="name"
            type="text"
            {...register('name')}
            className="input-base"
            placeholder="Ej. Teclado Mecanico Keychron"
            maxLength={200}
          />
          {errors.name && (
            <p className="mt-1.5 text-sm font-medium text-red-500">{errors.name.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="barcode" className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5">
              Codigo de Barras
            </label>
            <input
              id="barcode"
              type="text"
              {...register('barcode', {
                onChange: () => setConflictError(null),
              })}
              className="input-base font-mono text-sm"
              placeholder="Ej: 7750000000000"
              maxLength={30}
            />
          </div>

          <div>
            <label htmlFor="sku" className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5">
              SKU
            </label>
            <input
              id="sku"
              type="text"
              {...register('sku', {
                onChange: () => setConflictError(null),
              })}
              className="input-base font-mono text-sm"
              placeholder="Codigo interno"
              maxLength={50}
            />
          </div>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5">
            Descripcion
          </label>
          <textarea
            id="description"
            rows={3}
            {...register('description')}
            className="input-base resize-none"
            placeholder="Descripcion detallada del producto..."
            maxLength={500}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="costPrice" className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5">
              Precio de Costo ($) *
            </label>
            <input
              id="costPrice"
              type="number"
              step="0.01"
              {...register('costPrice')}
              onKeyDown={blockInvalidChars}
              className="input-base tabular-data"
              placeholder="0.00"
            />
            {errors.costPrice && (
              <p className="mt-1.5 text-sm font-medium text-red-500">{errors.costPrice.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="salePrice" className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5">
              Precio de Venta ($) *
            </label>
            <input
              id="salePrice"
              type="number"
              step="0.01"
              {...register('salePrice')}
              onKeyDown={blockInvalidChars}
              className="input-base tabular-data"
              placeholder="0.00"
            />
            {errors.salePrice && (
              <p className="mt-1.5 text-sm font-medium text-red-500">{errors.salePrice.message}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="categoryId" className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5">
            Categoria
          </label>
          <select id="categoryId" {...register('categoryId')} className="input-base">
            <option value="">Sin categoria</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="productImage" className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5">
            Fotos del Producto (Para busqueda por IA)
          </label>
          <div className="flex flex-col gap-4">
            {!showCamera ? (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <input
                  id="productImage"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100"
                />
                <button
                  type="button"
                  onClick={() => setShowCamera(true)}
                  className="px-4 py-2 bg-blue-50 text-blue-700 font-semibold text-sm rounded-full hover:bg-blue-100 transition-colors flex items-center gap-2 whitespace-nowrap"
                >
                  <Camera className="w-4 h-4" />
                  Tomar Foto
                </button>
              </div>
            ) : (
              <div className="w-full max-w-md">
                <CameraCapture 
                  onCapture={(file) => {
                    setImageFiles((prev) => [...prev, file]);
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setImagePreviews((prev) => [...prev, reader.result as string]);
                    };
                    reader.readAsDataURL(file);
                    setShowCamera(false);
                  }}
                  onCancel={() => setShowCamera(false)}
                />
              </div>
            )}
          </div>
          {imagePreviews.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-4">
              {imagePreviews.map((preview, index) => (
                <img
                  key={index}
                  src={preview}
                  alt={`Preview ${index}`}
                  className="h-32 w-32 object-cover rounded-lg shadow-sm"
                />
              ))}
            </div>
          )}
        </div>

        <div className="pt-6 border-t border-[var(--border-light)]">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Umbrales de Stock</h3>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            Define los niveles de alerta para el inventario. El sistema notificara cuando el stock alcance
            estos umbrales.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label htmlFor="minStockInfo" className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  Sobrestock
                </span>
              </label>
              <input
              id="minStockInfo"
              type="number"
              min="0"
              {...register('minStockInfo')}
              onKeyDown={blockInvalidIntegerChars}
              className="input-base tabular-data"
              placeholder="0"
            />
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                Alerta cuando el stock sea mayor o igual a este valor
              </p>
            </div>

            <div>
              <label htmlFor="minStockWarning" className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  Advertencia
                </span>
              </label>
              <input
              id="minStockWarning"
              type="number"
              min="0"
              {...register('minStockWarning')}
              onKeyDown={blockInvalidIntegerChars}
              className="input-base tabular-data"
              placeholder="0"
            />
              <p className="mt-1 text-xs text-[var(--text-secondary)]">Reordenar pronto</p>
            </div>

            <div>
              <label
                htmlFor="minStockCritical"
                className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5"
              >
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  Critico
                </span>
              </label>
              <input
              id="minStockCritical"
              type="number"
              min="0"
              {...register('minStockCritical')}
              onKeyDown={blockInvalidIntegerChars}
              className="input-base tabular-data"
              placeholder="0"
            />
              <p className="mt-1 text-xs text-[var(--text-secondary)]">Reorden urgente</p>
              {errors.minStockCritical && (
                <p className="mt-1.5 text-sm font-medium text-red-500">{errors.minStockCritical.message}</p>
              )}
            </div>
          </div>
        </div>

        {conflictError && (
          <div className="p-4 rounded-xl mb-6 bg-amber-50 border border-amber-300 shadow-sm relative">
            <button
              type="button"
              onClick={() => setConflictError(null)}
              className="absolute top-2 right-2 p-1.5 text-amber-500 hover:text-amber-700 hover:bg-amber-100 rounded-md transition-colors"
            >
              <span className="text-lg leading-none font-bold">&times;</span>
            </button>
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1 pr-6">
                <p className="font-semibold text-amber-800">Producto duplicado</p>
                <p className="text-sm text-amber-700 mt-1">{conflictError.message}</p>
                <div className="flex flex-wrap gap-3 mt-3">
                  {conflictError.existingProductId && (
                    <button
                      type="button"
                      onClick={() => navigate(`/app/catalog/products/${conflictError.existingProductId}/edit`)}
                      className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold transition-colors"
                    >
                      Ver producto existente
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setValue('barcode', '');
                      setValue('sku', '');
                      setConflictError(null);
                      document.getElementById('barcode')?.focus();
                    }}
                    className="px-4 py-2 rounded-lg border border-amber-400 text-amber-700 hover:bg-amber-100 text-sm font-semibold transition-colors"
                  >
                    Cambiar barcode/SKU e intentar de nuevo
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-6 mt-6 border-t border-[var(--border-light)]">
          <button
            type="button"
            onClick={() => navigate('/app/catalog/products')}
            className="btn-secondary"
          >
            Cancelar
          </button>
          <button type="submit" disabled={isSaving || isProductInactive} className="btn-primary" title={isProductInactive ? 'Reactiva el producto primero' : undefined}>
            {isSaving ? 'Guardando...' : isEditing ? 'Actualizar Producto' : 'Crear Producto'}
          </button>
        </div>
      </form>
    </div>
  );
}
