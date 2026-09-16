// src/contexts/CartContext.tsx
//
// Full cart implementation. Persists to localStorage under STORAGE_KEY,
// storing only { productId, quantity } pairs — cart items are rehydrated
// against the current product catalogue on load, rather than storing a
// full product snapshot. This means price/stock changes in the catalogue
// are always reflected correctly, and malformed/stale localStorage data
// can be safely ignored per-entry instead of breaking the whole cart.

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { CartItem } from "../types/cart";
import type { Product } from "../types/product";
import { mockProducts } from "../data/products";

const STORAGE_KEY = "cosmo-cart";

interface StoredCartEntry {
  productId: string;
  quantity: number;
}

function findProduct(productId: string): Product | undefined {
  return mockProducts.find((product) => product.id === productId);
}

function readStoredCart(): CartItem[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const items: CartItem[] = [];

    for (const entry of parsed as unknown[]) {
      if (
        typeof entry !== "object" ||
        entry === null ||
        typeof (entry as StoredCartEntry).productId !== "string" ||
        typeof (entry as StoredCartEntry).quantity !== "number"
      ) {
        continue; // skip malformed entry rather than failing the whole cart
      }

      const { productId, quantity } = entry as StoredCartEntry;
      const product = findProduct(productId);
      if (!product) continue; // product no longer exists in the catalogue

      const safeQuantity = Math.min(
        Math.max(Math.floor(quantity), 1),
        product.stock
      );
      if (safeQuantity < 1) continue; // out of stock, drop it

      items.push({ product, quantity: safeQuantity });
    }

    return items;
  } catch {
    return []; // malformed JSON or any other read error — start fresh
  }
}

function writeStoredCart(items: CartItem[]) {
  if (typeof window === "undefined") return;

  const toStore: StoredCartEntry[] = items.map((item) => ({
    productId: item.product.id,
    quantity: item.quantity,
  }));

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  } catch {
    // localStorage unavailable (private browsing, quota, etc.) — fail silently,
    // cart still works for the current session via React state.
  }
}

interface CartContextValue {
  items: CartItem[];
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => readStoredCart());

  useEffect(() => {
    writeStoredCart(items);
  }, [items]);

  function addItem(product: Product, quantity = 1) {
    if (product.stock < 1) return; // never add out-of-stock products

    setItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);

      if (existing) {
        const nextQuantity = Math.min(
          existing.quantity + quantity,
          product.stock
        );
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: nextQuantity }
            : item
        );
      }

      const nextQuantity = Math.min(Math.max(quantity, 1), product.stock);
      return [...prev, { product, quantity: nextQuantity }];
    });
  }

  function removeItem(productId: string) {
    setItems((prev) => prev.filter((item) => item.product.id !== productId));
  }

  function updateQuantity(productId: string, quantity: number) {
    if (quantity < 1) {
      removeItem(productId);
      return;
    }

    setItems((prev) =>
      prev.map((item) =>
        item.product.id === productId
          ? { ...item, quantity: Math.min(quantity, item.product.stock) }
          : item
      )
    );
  }

  function clearCart() {
    setItems([]);
  }

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const value: CartContextValue = {
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    itemCount,
    subtotal,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used inside a <CartProvider>");
  }
  return context;
}
