import React from 'react';
import { Trash2 } from 'lucide-react';
import { useCartStore, type CartItem } from '../../stores/cartStore';

interface CartTableProps {
  onQuantityChange?: (productId: number, quantity: number) => void;
}

export const CartTable: React.FC<CartTableProps> = ({ onQuantityChange }) => {
  const { items, remove, updateQty, getTotal, getSubtotal, getItemCount } =
    useCartStore();

  const handleQuantityChange = (productId: number, value: string) => {
    const qty = parseInt(value, 10);
    if (qty > 0) {
      updateQty(productId, qty);
      onQuantityChange?.(productId, qty);
    }
  };

  const handleRemove = (productId: number) => {
    remove(productId);
  };

  if (items.length === 0) {
    return (
      <div className="p-6 sm:p-8 rounded-lg border-2 border-dashed text-center" style={{ backgroundColor: '#F9F7F2', borderColor: '#E8E3DB' }}>
        <p className="text-base font-medium" style={{ color: '#1F2937' }}>
          Carrito vacio
        </p>
        <p className="text-sm mt-2" style={{ color: '#6B7280' }} aria-label="Instructions to add products">
          Escanea productos para agregarlos al carrito
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full rounded-lg border" style={{ backgroundColor: '#FFFFFF', borderColor: '#E8E3DB' }}>
      {/* Mobile card layout */}
      <div className="flex-1 overflow-y-auto sm:hidden divide-y" style={{ borderColor: '#E8E3DB' }}>
        {items.map((item: CartItem) => (
          <div key={item.productId} className="p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate" style={{ color: '#1F2937' }}>{item.product.name}</p>
                <p className="text-xs mt-0.5" style={{ color: '#038E57', fontVariantNumeric: 'tabular-nums' }}>
                  $ {parseFloat(item.product.salePrice).toFixed(0)} c/u
                </p>
              </div>
              <button
                onClick={() => handleRemove(item.productId)}
                className="p-1.5 rounded transition flex-shrink-0"
                style={{ backgroundColor: '#FF2E21', color: '#FFFFFF' }}
                aria-label={`Remove ${item.product.name} from cart`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: '#6B7280' }}>Cant:</span>
                <input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => handleQuantityChange(item.productId, e.target.value)}
                  className="w-14 text-center text-sm rounded px-1.5 py-1 border"
                  style={{ backgroundColor: '#FFFFFF', borderColor: '#E8E3DB', color: '#1F2937' }}
                  aria-label={`Quantity for ${item.product.name}`}
                />
              </div>
              <span className="font-semibold text-sm" style={{ color: '#038E57', fontVariantNumeric: 'tabular-nums' }}>
                $ {parseFloat(getSubtotal(item)).toFixed(0)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table layout */}
      <div className="flex-1 overflow-x-auto overflow-y-auto hidden sm:block">
        <table className="w-full" aria-label="Shopping cart items" style={{ borderCollapse: 'collapse' }}>
          <thead className="sticky top-0" style={{ backgroundColor: '#F9F7F2', borderBottom: '1px solid #E8E3DB' }}>
            <tr>
              <th className="px-3 py-2.5 text-left text-sm font-semibold" scope="col" style={{ color: '#1F2937' }}>
                Producto
              </th>
              <th className="px-2 py-2.5 text-center text-sm font-semibold" scope="col" style={{ color: '#1F2937' }}>
                Cant.
              </th>
              <th className="px-3 py-2.5 text-right text-sm font-semibold" scope="col" style={{ color: '#1F2937' }}>
                Precio
              </th>
              <th className="px-3 py-2.5 text-right text-sm font-semibold hidden md:table-cell" scope="col" style={{ color: '#1F2937' }}>
                Subtotal
              </th>
              <th className="px-2 py-2.5 text-center text-sm font-semibold w-12" scope="col" style={{ color: '#1F2937' }}>
                <span className="sr-only">Accion</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item: CartItem) => (
              <tr 
                key={item.productId} 
                className="transition hover:bg-gray-50"
                style={{ borderBottom: '1px solid #E8E3DB' }}
              >
                <td className="px-3 py-2.5">
                  <span className="font-medium text-sm block truncate max-w-[140px] lg:max-w-none" style={{ color: '#1F2937' }}>
                    {item.product.name}
                  </span>
                </td>
                <td className="px-2 py-2.5">
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) =>
                      handleQuantityChange(item.productId, e.target.value)
                    }
                    className="w-14 text-center text-sm rounded px-1.5 py-1 border"
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#E8E3DB',
                      color: '#1F2937',
                    }}
                    aria-label={`Quantity for ${item.product.name}`}
                    title={`Change quantity for ${item.product.name}`}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#038E57';
                      e.currentTarget.style.boxShadow = 'inset 0 0 0 2px rgba(3, 142, 87, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#E8E3DB';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </td>
                <td className="px-3 py-2.5 text-right text-sm font-medium whitespace-nowrap" style={{ color: '#1F2937', fontVariantNumeric: 'tabular-nums' }}>
                  $ {parseFloat(item.product.salePrice).toFixed(0)}
                </td>
                <td className="px-3 py-2.5 text-right font-semibold text-sm whitespace-nowrap hidden md:table-cell" style={{ color: '#038E57', fontVariantNumeric: 'tabular-nums' }}>
                  $ {parseFloat(getSubtotal(item)).toFixed(0)}
                </td>
                <td className="px-2 py-2.5 text-center">
                  <button
                    onClick={() => handleRemove(item.productId)}
                    className="p-1.5 text-sm font-medium rounded transition"
                    style={{
                      backgroundColor: '#FF2E21',
                      color: '#FFFFFF',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.filter = 'brightness(0.9)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.filter = 'brightness(1)';
                    }}
                    aria-label={`Remove ${item.product.name} from cart`}
                    title={`Delete ${item.product.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="border-t p-3 sm:p-4 space-y-2" style={{ backgroundColor: '#F9F7F2', borderColor: '#E8E3DB' }}>
        <div className="flex justify-between text-sm">
          <span style={{ color: '#6B7280' }}>Items:</span>
          <span className="font-semibold" style={{ color: '#1F2937', fontVariantNumeric: 'tabular-nums' }} aria-label={`${getItemCount()} items in cart`}>
            {getItemCount()}
          </span>
        </div>
        <div className="flex justify-between pt-2 border-t" style={{ borderColor: '#E8E3DB' }}>
          <span className="font-semibold" style={{ color: '#1F2937' }}>
            Total:
          </span>
          <span className="text-lg font-bold" style={{ color: '#038E57', fontVariantNumeric: 'tabular-nums' }} aria-label={`Cart total: $ ${parseFloat(getTotal()).toFixed(0)}`}>
            $ {parseFloat(getTotal()).toFixed(0)}
          </span>
        </div>
      </div>
    </div>
  );
};
