import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { productApi } from '../../api/catalog';
import type { Product, PageResponse } from '../../types';
import { useAuthStore } from '../../stores/authStore';
import { ProductTable } from '../../components/catalog/ProductTable';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';

export function ProductListPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ id: number; name: string; mode: 'deactivate' | 'activate' } | null>(null);
  const [isConfirmLoading, setIsConfirmLoading] = useState(false);

  const hasRole = useAuthStore((state) => state.hasRole);
  const canEdit = hasRole(['ADMIN', 'WAREHOUSE']);

  useEffect(() => {
    loadProducts();
  }, [page]);

  const loadProducts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response: PageResponse<Product> = await productApi.getAll(page, 10);
      setProducts(response.content);
      setTotalPages(response.totalPages);
      setTotalElements(response.totalElements);
    } catch (err) {
      setError('Error al cargar los productos');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async () => {
    if (!confirmAction) return;

    setIsConfirmLoading(true);
    setError(null);

    try {
      if (confirmAction.mode === 'deactivate') {
        await productApi.delete(confirmAction.id);
        setSuccessMsg('Producto desactivado correctamente');
      } else {
        await productApi.activate(confirmAction.id);
        setSuccessMsg('Producto reactivado correctamente');
      }

      setConfirmAction(null);
      setTimeout(() => setSuccessMsg(null), 3000);
      await loadProducts();
    } catch (err) {
      setError(
        confirmAction.mode === 'deactivate'
          ? 'Error al desactivar el producto'
          : 'Error al reactivar el producto'
      );
      console.error(err);
    } finally {
      setIsConfirmLoading(false);
    }
  };

  const handleAction = (product: Product, mode: 'activate' | 'deactivate') => {
    setConfirmAction({
      id: product.id,
      name: product.name,
      mode: mode,
    });
  };

  if (isLoading && products.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-[var(--text-secondary)]">Cargando productos...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Productos</h1>
          <p className="mt-1 text-[var(--text-secondary)] text-sm">
            {totalElements} producto{totalElements !== 1 ? 's' : ''} en total
          </p>
        </div>
        {canEdit && (
          <div className="flex gap-3">
            <Link
              to="/app/catalog/products/inactive"
              className="btn-secondary"
            >
              Activar productos
            </Link>
            <Link
              to="/app/catalog/products/new"
              className="btn-primary"
            >
              Nuevo Producto
            </Link>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 shadow-sm">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-700 shadow-sm font-medium text-sm">
          {successMsg}
        </div>
      )}

      <ProductTable
        products={products}
        canEdit={canEdit}
        onAction={handleAction}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-6 card p-4">
          <div className="text-sm text-[var(--text-secondary)] font-medium">
            Mostrando página <span className="text-[var(--text-primary)] font-bold">{page + 1}</span> de <span className="text-[var(--text-primary)] font-bold">{totalPages}</span>
          </div>
          <div className="flex space-x-2">
            <button
               onClick={() => setPage((p) => Math.max(0, p - 1))}
               disabled={page === 0}
               className="btn-secondary px-3 py-1.5 text-sm"
             >
               Anterior
             </button>
             <button
               onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
               disabled={page >= totalPages - 1}
               className="btn-secondary px-3 py-1.5 text-sm"
             >
               Siguiente
             </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmAction !== null}
        title={confirmAction?.mode === 'deactivate' ? 'Desactivar producto' : 'Reactivar producto'}
        message={
          confirmAction
            ? confirmAction.mode === 'deactivate'
              ? `Se desactivará "${confirmAction.name}" y no aparecerá en operaciones activas.`
              : `Se reactivará "${confirmAction.name}" y volverá a estar disponible.`
            : ''
        }
        confirmLabel={
          isConfirmLoading
            ? confirmAction?.mode === 'deactivate'
              ? 'Desactivando...'
              : 'Reactivando...'
            : confirmAction?.mode === 'deactivate'
              ? 'Desactivar'
              : 'Reactivar'
        }
        cancelLabel="Cancelar"
        variant={confirmAction?.mode === 'deactivate' ? 'danger' : 'default'}
        onConfirm={handleStatusChange}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
