import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { productApi } from '../../api/catalog';
import type { Product, PageResponse } from '../../types';
import { useAuthStore } from '../../stores/authStore';
import { ProductTable } from '../../components/catalog/ProductTable';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';

export function InactiveProductListPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [confirmProduct, setConfirmProduct] = useState<Product | null>(null);
  const [isConfirmLoading, setIsConfirmLoading] = useState(false);

  const hasRole = useAuthStore((state) => state.hasRole);
  const canEdit = hasRole(['ADMIN', 'WAREHOUSE']);

  useEffect(() => {
    loadInactiveProducts();
  }, [page]);

  const loadInactiveProducts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response: PageResponse<Product> = await productApi.getInactive(page, 10);
      setProducts(response.content);
      setTotalPages(response.totalPages);
      setTotalElements(response.totalElements);
    } catch (err) {
      setError('Error al cargar los productos desactivados');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleActionClick = (product: Product, mode: 'activate' | 'deactivate') => {
    if (mode === 'activate') {
      setConfirmProduct(product);
    }
  };

  const handleConfirmReactivation = async () => {
    if (!confirmProduct) return;

    setIsConfirmLoading(true);
    setError(null);

    try {
      await productApi.activate(confirmProduct.id);
      setSuccessMessage(`Producto "${confirmProduct.name}" reactivado correctamente`);
      setConfirmProduct(null);
      setTimeout(() => setSuccessMessage(null), 3000);
      await loadInactiveProducts();
    } catch (err) {
      setError('Error al reactivar el producto');
      console.error(err);
    } finally {
      setIsConfirmLoading(false);
    }
  };

  if (isLoading && products.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-[var(--text-secondary)]">Cargando productos desactivados...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
            Productos Desactivados
          </h1>
          <p className="mt-1 text-[var(--text-secondary)] text-sm">
            {totalElements} producto{totalElements !== 1 ? 's' : ''} desactivado{totalElements !== 1 ? 's' : ''} en total
          </p>
        </div>
        <Link to="/app/catalog/products" className="btn-secondary">
          Volver a Productos
        </Link>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 shadow-sm">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-700 shadow-sm font-medium text-sm">
          {successMessage}
        </div>
      )}

      <ProductTable
        products={products}
        canEdit={canEdit}
        onAction={handleActionClick}
        emptyMessage="no hay productos desactivados por el momento"
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
        isOpen={confirmProduct !== null}
        title="Reactivar producto"
        message={
          confirmProduct
            ? `¿Está seguro de que desea reactivar el producto "${confirmProduct.name}"? Volverá a estar disponible para operaciones.`
            : ''
        }
        confirmLabel={isConfirmLoading ? 'Reactivando...' : 'Reactivar'}
        cancelLabel="Cancelar"
        onConfirm={handleConfirmReactivation}
        onCancel={() => setConfirmProduct(null)}
      />
    </div>
  );
}
