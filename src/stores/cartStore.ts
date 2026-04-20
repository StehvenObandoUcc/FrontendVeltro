import { create } from 'zustand';
import type { Product } from '../types';

export interface CartItem {
  productId: number;
  product: Product;
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  add: (product: Product, quantity: number) => void;
  remove: (productId: number) => void;
  updateQty: (productId: number, quantity: number) => void;
  clear: () => void;
  getTotal: () => string;
  getItemCount: () => number;
  getSubtotal: (item: CartItem) => string;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],

  add: (product, quantity) => {
    set((state) => {
      const requestedQty = Number.isFinite(quantity) ? Math.max(0, Math.floor(quantity)) : 0;
      if (requestedQty <= 0) {
        return state;
      }

      const pid = product.id;
      const existingItem = state.items.find((item) => item.productId === pid);
      if (existingItem) {
        const nextQuantity = existingItem.quantity + requestedQty;

        return {
          items: state.items.map((item) =>
            item.productId === pid
              ? { ...item, quantity: nextQuantity }
              : item
          ),
        };
      }

      const initialQuantity = requestedQty;

      if (initialQuantity <= 0) {
        return state;
      }

      return {
        items: [
          ...state.items,
          {
            productId: pid,
            product,
            quantity: initialQuantity,
          },
        ],
      };
    });
  },

  remove: (productId) => {
    set((state) => ({
      items: state.items.filter((item) => item.productId !== productId),
    }));
  },

  updateQty: (productId, quantity) => {
    if (quantity <= 0) {
      get().remove(productId);
      return;
    }

    set((state) => {
      const updatedItems = state.items
        .map((item) => {
          if (item.productId !== productId) {
            return item;
          }

          const parsedQty = Math.max(1, Math.floor(quantity));
          return { ...item, quantity: parsedQty };
        })
        .filter((item): item is CartItem => item !== null);

      return { items: updatedItems };
    });
  },

  clear: () => {
    set({ items: [] });
  },

  getSubtotal: (item) => {
    const price = parseFloat(item.product.salePrice);
    const subtotal = price * item.quantity;
    return subtotal.toFixed(2);
  },

  getTotal: () => {
    const { items } = get();
    const total = items.reduce((sum, item) => {
      const price = parseFloat(item.product.salePrice);
      const subtotal = price * item.quantity;
      return sum + subtotal;
    }, 0);

    return total.toFixed(2);
  },

  getItemCount: () => {
    const { items } = get();
    return items.reduce((count, item) => count + item.quantity, 0);
  },
}));
