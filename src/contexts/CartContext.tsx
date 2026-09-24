// src/contexts/CartContext.tsx
//
// Persists only { productId, quantity } pairs to localStorage.
// Product details are rehydrated from the current Supabase catalogue.

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { CartItem } from "../types/cart";
import type { Product } from "../types/product";
import { fetchActiveProducts } from "@/lib/fetchProducts";

const STORAGE_KEY = "cosmo-cart";

interface StoredCartEntry {
  productId: string;
  quantity: number;
}

function readStoredCartEntries(): StoredCartEntry[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((entry): entry is StoredCartEntry => {
      if (typeof entry !== "object" || entry === null) return false;

      const candidate = entry as Record<string, unknown>;

      return (
        typeof candidate.productId === "string" &&
        typeof candidate.quantity === "number"
      );
    });
  } catch {
    return [];
  }
}

function writeStoredCartEntries(entries: StoredCartEntry[]) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // localStorage unavailable — cart still works for the current session.
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
  // Keep localStorage lightweight: only product IDs and quantities.
  const [storedEntries, setStoredEntries] = useState<StoredCartEntry[]>(() =>
    readStoredCartEntries()
  );

  // Current product catalogue loaded from Supabase.
  const [products, setProducts] = useState<Product[]>([]);

  // Prevent the initial empty product state from overwriting localStorage.
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function hydrateCart() {
      try {
        const currentProducts = await fetchActiveProducts();

        if (cancelled) return;

        setProducts(currentProducts);

        const productById = new Map(
          currentProducts.map((product) => [product.id, product])
        );

        setStoredEntries((previousEntries) => {
          const validEntries: StoredCartEntry[] = [];

          for (const entry of previousEntries) {
            const product = productById.get(entry.productId);

            // Product was deleted, deactivated, or otherwise unavailable.
            if (!product || product.stock < 1) continue;

            const safeQuantity = Math.min(
              Math.max(Math.floor(entry.quantity), 1),
              product.stock
            );

            if (safeQuantity < 1) continue;

            validEntries.push({
              productId: entry.productId,
              quantity: safeQuantity,
            });
          }

          return validEntries;
        });
      } catch {
        // Keep the stored entries intact if Supabase cannot be reached.
        // A later page refresh will try the hydration again.
      } finally {
        if (!cancelled) {
          setIsHydrated(true);
        }
      }
    }

    hydrateCart();

    return () => {
      cancelled = true;
    };
  }, []);

  // Only write to localStorage after the Supabase hydration has completed.
  useEffect(() => {
    if (!isHydrated) return;

    writeStoredCartEntries(storedEntries);
  }, [storedEntries, isHydrated]);

  // Convert stored IDs/quantities into the current Product objects.
  const items: CartItem[] = storedEntries
    .map((entry) => {
      const product = products.find((item) => item.id === entry.productId);

      if (!product || product.stock < 1) return null;

      const safeQuantity = Math.min(
        Math.max(Math.floor(entry.quantity), 1),
        product.stock
      );

      if (safeQuantity < 1) return null;

      return {
        product,
        quantity: safeQuantity,
      };
    })
    .filter((item): item is CartItem => item !== null);

  function addItem(product: Product, quantity = 1) {
    if (product.stock < 1) return;

    setStoredEntries((previousEntries) => {
      const existing = previousEntries.find(
        (entry) => entry.productId === product.id
      );

      if (existing) {
        const nextQuantity = Math.min(
          existing.quantity + quantity,
          product.stock
        );

        return previousEntries.map((entry) =>
          entry.productId === product.id
            ? { ...entry, quantity: nextQuantity }
            : entry
        );
      }

      const nextQuantity = Math.min(
        Math.max(Math.floor(quantity), 1),
        product.stock
      );

      return [
        ...previousEntries,
        {
          productId: product.id,
          quantity: nextQuantity,
        },
      ];
    });
  }

  function removeItem(productId: string) {
    setStoredEntries((previousEntries) =>
      previousEntries.filter((entry) => entry.productId !== productId)
    );
  }

  function updateQuantity(productId: string, quantity: number) {
    if (quantity < 1) {
      removeItem(productId);
      return;
    }

    setStoredEntries((previousEntries) =>
      previousEntries.map((entry) => {
        if (entry.productId !== productId) return entry;

        const product = products.find((item) => item.id === productId);

        if (!product || product.stock < 1) {
          return entry;
        }

        return {
          ...entry,
          quantity: Math.min(Math.floor(quantity), product.stock),
        };
      })
    );
  }

  function clearCart() {
    setStoredEntries([]);
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