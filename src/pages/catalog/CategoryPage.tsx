import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { categoryApi } from '../../api/catalog';
import type { Category } from '../../types';
import { CategoryTree } from '../../components/catalog/CategoryTree';
import { useAuthStore } from '../../stores/authStore';
import type { AxiosError } from 'axios';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';

const categorySchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(30, 'Maximo 30 caracteres'),
  description: z.string().max(40, 'Maximo 40 caracteres').optional(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

export function CategoryPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const hasRole = useAuthStore((state) => state.hasRole);

  const canEdit = hasRole(['ADMIN', 'WAREHOUSE']);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setIsLoading(true);
    try {
      const tree = await categoryApi.getAll();
      setCategories(tree);
    } catch (err) {
      setError('Error al cargar las categorías');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNew = () => {
    setEditingCategory(null);
    reset({ name: '', description: '' });
    setShowForm(true);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    reset({
      name: category.name,
      description: category.description || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (category: Category) => {
    setCategoryToDelete(category);
  };

  const confirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    try {
      await categoryApi.delete(categoryToDelete.id);
      setSuccessMsg(`Categoría "${categoryToDelete.name}" desactivada correctamente`);
      setTimeout(() => setSuccessMsg(null), 3000);
      await loadCategories();
    } catch (err) {
      setError('Error al desactivar la categoría');
      console.error(err);
    } finally {
      setCategoryToDelete(null);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingCategory(null);
    reset();
  };

  const onSubmit = async (data: CategoryFormData) => {
    setIsSaving(true);
    setError(null);

    const categoryData = {
      name: data.name,
      description: data.description || undefined,
    };

    try {
      if (editingCategory) {
        await categoryApi.update(editingCategory.id, categoryData);
      } else {
        await categoryApi.create(categoryData);
      }
      setShowForm(false);
      setEditingCategory(null);
      reset();
      loadCategories();
    } catch (err) {
      const axiosError = err as AxiosError<{ message: string }>;
      setError(axiosError.response?.data?.message || 'Error al guardar la categoría');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-[var(--text-secondary)]">Cargando categorías...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Categorías</h1>
          <p className="text-sm text-gray-500 mt-1">Gestione la jerarquía de categorías para sus productos</p>
        </div>
        {canEdit && (
          <button
            onClick={handleNew}
            className="bg-[var(--primary-base)] text-white px-4 py-2 rounded-lg font-medium hover:bg-[var(--primary-dark)] transition-colors shadow-sm"
          >
            + Nueva Categoría
          </button>
        )}
      </div>

      {error && !showForm && (
        <div className="p-4 rounded-xl mb-6 bg-red-50 border border-red-200 text-red-600 shadow-sm">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl mb-6 bg-green-50 border border-green-200 text-green-700 shadow-sm font-medium text-sm">
          {successMsg}
        </div>
      )}

      <div className={showForm ? "grid grid-cols-1 lg:grid-cols-3 gap-8" : "block"}>
        {/* Category Tree */}
        <div className={showForm ? "lg:col-span-2" : "w-full"}>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <CategoryTree
              categories={categories}
              onEdit={canEdit ? handleEdit : undefined}
              onDelete={canEdit ? handleDelete : undefined}
            />
          </div>
        </div>

        {/* Category Form */}
        {showForm && canEdit && (
          <div className="lg:col-span-1">
            <div className="sticky top-6 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-900">
                  {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
                </h2>
                <button 
                  onClick={handleCancel}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </div>

              {error && (
                <div className="mx-6 mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-1">
                    Nombre *
                  </label>
                  <input
                    id="name"
                    type="text"
                    {...register('name')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--primary-base)] focus:border-transparent outline-none transition-all"
                    placeholder="Ej. Accesorios"
                    maxLength={30}
                  />
                  {errors.name && (
                    <p className="mt-1.5 text-sm font-medium text-red-500">{errors.name.message}</p>
                  )}
                </div>

            <div>
              <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-1">
                Descripción
              </label>
              <textarea
                id="description"
                rows={3}
                {...register('description')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--primary-base)] focus:border-transparent outline-none transition-all resize-none"
                placeholder="Descripción de la categoría"
                maxLength={40}
              />
            </div>

             <div className="flex gap-3 pt-4 mt-6 border-t border-gray-100">
               <button
                 type="button"
                 onClick={handleCancel}
                 className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
               >
                 Cancelar
               </button>
               <button
                 type="submit"
                 disabled={isSaving}
                 className="flex-1 px-4 py-2 bg-[var(--primary-base)] text-white rounded-lg font-medium hover:bg-[var(--primary-dark)] transition-colors shadow-sm disabled:opacity-70 flex justify-center items-center"
               >
                 {isSaving ? (
                   <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                 ) : editingCategory ? 'Actualizar' : 'Crear'}
               </button>
             </div>
          </form>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={categoryToDelete !== null}
        title="Desactivar categoría"
        message={`¿Está seguro de desactivar la categoría "${categoryToDelete?.name ?? ''}"?`}
        confirmLabel="Desactivar"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={confirmDeleteCategory}
        onCancel={() => setCategoryToDelete(null)}
      />
    </div>
  );
}
