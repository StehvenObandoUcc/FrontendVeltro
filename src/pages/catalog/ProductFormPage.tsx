import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Camera, AlertTriangle, CheckCircle } from 'lucide-react';
import { productApi, categoryApi } from '../../api/catalog';
import { ProductScanner, type ScannedProductData } from '../../components/catalog';
import type { Category } from '../../types';
import type { AxiosError } from 'axios';

const productSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  barcode: z.string().optional(),
  sku: z.string().optional(),
  description: z.string().optional(),
  costPrice: z.string().min(1, 'El precio de costo es requerido'),
  salePrice: z.string().min(1, 'El precio de venta es requerido'),
  categoryId: z.string().optional(),
  minStockInfo: z.string().optional(),
  minStockWarning: z.string().optional(),
  minStockCritical: z.string().optional(),
}).refine((data) => {
  const info = parseInt(data.minStockInfo || '0') || 0;
  const warning = parseInt(data.minStockWarning || '0') || 0;
  const critical = parseInt(data.minStockCritical || '0') || 0;
  return critical <= warning && warning <= info;
}, {
  message: 'Los umbrales deben cumplir: Crítico <= Advertencia <= Informativo',
  path: ['minStockCritical'],
});

type ProductFormData = z.infer<typeof productSchema>;

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
        return resolve(file); // fallback
      }
      
      // CRÍTICO: Rellenar con blanco para evitar que transparencias (PNG/WebP) pasen a negro
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      
      canvas.toBlob((blob) => {
          URL.revokeObjectURL(url);
          if (!blob) return resolve(file); // fallback
          const jpegName = file.name.replace(/\.[^.]+$/, '.jpg');
          resolve(new File([blob], jpegName, { type: 'image/jpeg' }));
        }, 'image/jpeg', 0.92);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file); // fallback
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
  const [error, setError] = useState<string | null>(null);

  // Conflict state — when barcode/SKU already exists
  const [conflictError, setConflictError] = useState<{
    message: string;
    existingProductId: number | null;
  } | null>(null);

  // Image upload state
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  // Scanner state
  const [showScanner, setShowScanner] = useState(false);
  const [scanWarning, setScanWarning] = useState<string | null>(null);
  const [scanSuccess, setScanSuccess] = useState<string | null>(null);

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
    loadCategories();
    if (isEditing && id) {
      loadProduct(parseInt(id));
    }
  }, [id]);

  // Clear scan messages after delay
  useEffect(() => {
    if (scanWarning) {
      const t = setTimeout(() => setScanWarning(null), 6000);
      return () => clearTimeout(t);
    }
  }, [scanWarning]);

  useEffect(() => {
    if (scanSuccess) {
      const t = setTimeout(() => setScanSuccess(null), 4000);
      return () => clearTimeout(t);
    }
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
      reset({
        name: product.name,
        barcode: product.barcode || '',
        sku: product.sku || '',
        description: product.description || '',
        costPrice: product.costPrice,
        salePrice: product.salePrice,
        categoryId: product.categoryId?.toString() || '',
        minStockInfo: product.minStockInfo?.toString() || '0',
        minStockWarning: product.minStockWarning?.toString() || '0',
        minStockCritical: product.minStockCritical?.toString() || '0',
      });
    } catch (err) {
      setError('Error al cargar el producto');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  /** Handle scanner result — auto-fill form fields */
  const handleScanResult = (data: ScannedProductData) => {
    setScanWarning(null);
    setScanSuccess(null);

    if (data.barcode) {
      setValue('barcode', data.barcode);
    }

    if (data.existsInDb) {
      // Product already exists — warn the user
      setScanWarning(
        `Este producto ya existe en el sistema (ID: ${data.existingProductId}). ` +
        `Si deseas editarlo, ve a la lista de productos.`
      );

      if (!isEditing) {
        // Still fill the fields so user can see what was found
        if (data.name) setValue('name', data.name);
        if (data.description) setValue('description', data.description);
        if (data.suggestedPrice) setValue('salePrice', data.suggestedPrice);
      }
      setShowScanner(false);
      return;
    }

    // Product is new — fill fields
    let filled: string[] = [];

    if (data.barcode) {
      filled.push('código de barras');
    }
    if (data.name) {
      setValue('name', data.name);
      filled.push('nombre');
    }
    if (data.description) {
      setValue('description', data.description);
      filled.push('descripción');
    }
    if (data.suggestedPrice) {
      setValue('salePrice', data.suggestedPrice);
      filled.push('precio de venta');
    }

    if (data.source === 'ai' && data.confidence !== undefined) {
      const pct = Math.round(data.confidence * 100);
      setScanSuccess(
        `IA completó: ${filled.join(', ')} (${pct}% confianza). Verifica los datos antes de guardar.`
      );
    } else if (data.source === 'barcode-new') {
      setScanSuccess(`Código de barras registrado. Completa los demás campos.`);
    } else if (filled.length > 0) {
      setScanSuccess(`Campos completados: ${filled.join(', ')}.`);
    }

    setShowScanner(false);
  };

  const onSubmit = async (data: ProductFormData) => {
    setIsSaving(true);
    setError(null);
    setConflictError(null);

    const productData = {
      name: data.name,
      barcode: data.barcode || undefined,
      sku: data.sku || undefined,
      description: data.description || undefined,
      costPrice: data.costPrice,
      salePrice: data.salePrice,
      categoryId: data.categoryId ? parseInt(data.categoryId) : undefined,
      minStockInfo: data.minStockInfo ? parseInt(data.minStockInfo) : 0,
      minStockWarning: data.minStockWarning ? parseInt(data.minStockWarning) : 0,
      minStockCritical: data.minStockCritical ? parseInt(data.minStockCritical) : 0,
    };

    try {
      let savedProductId = isEditing && id ? parseInt(id) : null;

      if (isEditing && id) {
        await productApi.update(parseInt(id), productData);
        savedProductId = parseInt(id);
      } else {
        const imageFile = imageFiles[0] ? await normalizeToJpeg(imageFiles[0]) : null;
        const createdProduct = await productApi.create(productData, imageFile);
        savedProductId = createdProduct.id;
      }

      // Upload images for both create (additional images) and update (new images for embedding)
      if (imageFiles.length > 0 && savedProductId && isEditing) {
        try {
          const normalizedImages = await Promise.all(imageFiles.map(normalizeToJpeg));
          await productApi.uploadImages(savedProductId, normalizedImages);
          console.log(`[PRODUCT] Images uploaded and embedding generated for product id=${savedProductId}`);
        } catch (imgErr) {
          console.error('Error uploading images:', imgErr);
        }
      }

      navigate('/catalog/products');
    } catch (err) {
      const axiosError = err as AxiosError<{ message: string; existingId?: number; existingProductId?: number }>;
      const status = axiosError.response?.status;
      const responseData = axiosError.response?.data;

      if (status === 409) {
        // Extract existing product ID from the error message if present
        const msg = responseData?.message ?? '';
        const idMatch = msg.match(/id[:\s]+(\d+)/i);
        const existingId = responseData?.existingProductId ?? responseData?.existingId ?? (idMatch ? parseInt(idMatch[1]) : null);
        setConflictError({
          message: 'Ya existe un producto con este código de barras o SKU.',
          existingProductId: existingId
        });
      } else {
        setError(responseData?.message || 'Error al guardar el producto');
      }
    } finally {
      setIsSaving(false);
    }
  };


  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      setImageFiles(prev => [...prev, ...files]);
      
      files.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  /** Controla la navegación en el formulario usando la tecla Enter */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
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
        'minStockCritical'
      ];
      
      const currentIndex = fieldOrder.indexOf(target.id);
      
      // Si el elemento actual está en nuestra lista pero no es el último
      if (currentIndex !== -1 && currentIndex < fieldOrder.length - 1) {
        e.preventDefault(); // Evitamos que el formulario se envíe prematuramente
        const nextId = fieldOrder[currentIndex + 1];
        const nextElement = document.getElementById(nextId);
        
        if (nextElement) {
          nextElement.focus();
          // Opcional: si queremos seleccionar el texto al enfocar
          // if (nextElement.tagName === 'INPUT' || nextElement.tagName === 'TEXTAREA') {
          //   (nextElement as HTMLInputElement).select();
          // }
        }
      }
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
          {isEditing ? 'Actualiza los datos del producto seleccionado.' : 'Completa el formulario para registrar un nuevo producto en el catálogo.'}
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl mb-6 bg-red-50 border border-red-200 text-red-600 shadow-sm">
          {error}
        </div>
      )}



      {/* Scanner Section — toggle button + scanner */}
      <div className="mb-6">
        {!showScanner ? (
          <button
            type="button"
            onClick={() => setShowScanner(true)}
            className="w-full py-3 px-4 rounded-xl border-2 border-dashed border-[var(--border-default)] bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:border-[var(--primary-base)] hover:text-[var(--primary-base)] transition-colors flex items-center justify-center gap-2"
          >
            <Camera className="w-5 h-5" />
            <span className="text-sm font-medium">Escanear producto con cámara o IA</span>
          </button>
        ) : (
          <div className="card p-4">
            <ProductScanner
              onResult={handleScanResult}
              onClose={() => setShowScanner(false)}
            />
          </div>
        )}

        {/* Scan warning (product exists) */}
        {scanWarning && (
          <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{scanWarning}</span>
          </div>
        )}

        {/* Scan success */}
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
             placeholder="Ej. Teclado Mecánico Keychron"
           />
          {errors.name && (
            <p className="mt-1.5 text-sm font-medium text-red-500">{errors.name.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="barcode" className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5">
              Código de Barras
            </label>
            <input
               id="barcode"
               type="text"
               {...register('barcode', {
                 onChange: () => setConflictError(null)
               })}
               className="input-base font-mono text-sm"
               placeholder="Ej: 7750000000000"
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
                 onChange: () => setConflictError(null)
               })}
               className="input-base font-mono text-sm"
               placeholder="Código interno"
             />
          </div>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5">
            Descripción
          </label>
          <textarea
            id="description"
            rows={3}
            {...register('description')}
            className="input-base resize-none"
            placeholder="Descripción detallada del producto..."
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
            Categoría
          </label>
          <select
            id="categoryId"
            {...register('categoryId')}
            className="input-base"
          >
            <option value="">Sin categoría</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        {/* Image Upload Section */}
        <div>
          <label htmlFor="productImage" className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5">
            Fotos del Producto (Para búsqueda por IA)
          </label>
          <div className="flex items-center gap-4">
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
          </div>
          {imagePreviews.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-4">
              {imagePreviews.map((preview, index) => (
                <img key={index} src={preview} alt={`Preview ${index}`} className="h-32 w-32 object-cover rounded-lg shadow-sm" />
              ))}
            </div>
          )}
        </div>

        {/* Stock Threshold Section */}
        <div className="pt-6 border-t border-[var(--border-light)]">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
            Umbrales de Stock
          </h3>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            Define los niveles de alerta para el inventario. El sistema notificará cuando el stock alcance estos umbrales.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label htmlFor="minStockInfo" className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  Informativo
                </span>
              </label>
              <input
                id="minStockInfo"
                type="number"
                min="0"
                {...register('minStockInfo')}
                className="input-base tabular-data"
                placeholder="0"
              />
              <p className="mt-1 text-xs text-[var(--text-secondary)]">Stock bajo</p>
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
                className="input-base tabular-data"
                placeholder="0"
              />
              <p className="mt-1 text-xs text-[var(--text-secondary)]">Reordenar pronto</p>
            </div>

            <div>
              <label htmlFor="minStockCritical" className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  Crítico
                </span>
              </label>
              <input
                id="minStockCritical"
                type="number"
                min="0"
                {...register('minStockCritical')}
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

         {/* 409 Conflict Banner */}
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
                       onClick={() => navigate(`/catalog/products/${conflictError.existingProductId}/edit`)}
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
             onClick={() => navigate('/catalog/products')}
             className="btn-secondary"
           >
             Cancelar
           </button>
           <button
             type="submit"
             disabled={isSaving}
             className="btn-primary"
           >
             {isSaving ? 'Guardando...' : isEditing ? 'Actualizar Producto' : 'Crear Producto'}
           </button>
         </div>
      </form>
    </div>
  );
}
