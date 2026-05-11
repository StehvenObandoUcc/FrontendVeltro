import React from 'react';
import { Link } from 'react-router-dom';
import type { Product } from '../../types';
import { formatCurrency } from '../../utils/formatCurrency';

interface ProductTableProps {
  products: Product[];
  canEdit: boolean;
  onAction: (product: Product, mode: 'activate' | 'deactivate') => void;
  emptyMessage?: string;
}

export const ProductTable: React.FC<ProductTableProps> = ({
  products,
  canEdit,
  onAction,
  emptyMessage = 'No hay productos registrados',
}) => {
  return (
    <div className="card overflow-x-auto">
      <table className="table-responsive w-full">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Código de Barras</th>
            <th>Categoría</th>
            <th className="text-right">Precio Costo</th>
            <th className="text-right">Precio Venta</th>
            <th className="text-center">Estado</th>
            {canEdit && <th className="text-right">Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id}>
              <td>
                <div className="text-sm font-semibold text-[var(--text-primary)]">
                  {product.name}
                </div>
                {product.sku && (
                  <div className="text-xs text-[var(--text-tertiary)] mt-0.5 font-mono">
                    SKU: {product.sku}
                  </div>
                )}
              </td>
              <td className="text-sm text-[var(--text-secondary)] font-mono">
                {product.barcode || '-'}
              </td>
              <td className="text-sm text-[var(--text-secondary)]">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
                  {product.categoryName || 'Sin categoría'}
                </span>
              </td>
              <td className="text-sm text-right tabular-data font-medium text-[var(--text-primary)]">
                {formatCurrency(product.costPrice)}
              </td>
              <td className="text-sm text-right tabular-data font-bold text-[var(--primary-base)]">
                {formatCurrency(product.salePrice)}
              </td>
              <td className="text-center">
                <span
                  className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    product.active
                      ? 'bg-[var(--primary-faint)] text-[var(--primary-base)]'
                      : 'bg-red-50 text-red-600'
                  }`}
                >
                  {product.active ? 'Activo' : 'Inactivo'}
                </span>
              </td>
              {canEdit && (
                <td className="text-right text-sm font-medium space-x-3">
                  <Link
                    to={`/app/catalog/products/${product.id}/edit`}
                    className="text-[var(--primary-base)] hover:text-[var(--primary-dark)] transition-colors"
                  >
                    Editar
                  </Link>
                  <button
                    onClick={() =>
                      onAction(product, product.active ? 'deactivate' : 'activate')
                    }
                    className={`transition-colors ${
                      product.active
                        ? 'text-red-500 hover:text-red-700'
                        : 'text-[var(--primary-base)] hover:text-[var(--primary-dark)]'
                    }`}
                  >
                    {product.active ? 'Desactivar' : 'Reactivar'}
                  </button>
                </td>
              )}
            </tr>
          ))}
          {products.length === 0 && (
            <tr>
              <td colSpan={canEdit ? 7 : 6} className="py-12 text-center text-[var(--text-tertiary)]">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
