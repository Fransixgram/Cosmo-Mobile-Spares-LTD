// src/components/ProductCard.tsx
//
// Reusable product card. "Add to Cart" now uses the real CartContext.
// No cart logic lives here — this component only calls addItem() and
// reads the current in-cart quantity to respect stock limits.

import { Link } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import type { Product } from "@/types/product";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/contexts/ToastContext";

interface ProductCardProps {
  product: Product;
}

function formatNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function ProductCard({ product }: ProductCardProps) {
  const { items, addItem } = useCart();
  const { showToast } = useToast();

  const inStock = product.stock > 0;
  const quantityInCart =
    items.find((item) => item.product.id === product.id)?.quantity ?? 0;
  const atStockLimit = inStock && quantityInCart >= product.stock;
  const canAddToCart = inStock && !atStockLimit;

  function handleAddToCart() {
    if (!canAddToCart) return;
    addItem(product);
    showToast("Added to cart");
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-md">
      <Link
        to={`/product/${product.id}`}
        className="block aspect-square overflow-hidden bg-muted"
      >
        <img
          src={product.images[0]}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {product.category}
        </span>

        <Link to={`/product/${product.id}`} className="hover:underline">
          <h3 className="text-sm font-semibold leading-snug">{product.name}</h3>
        </Link>

        <div className="mt-auto flex items-center justify-between pt-1">
          <span className="text-base font-semibold">
            {formatNaira(product.price)}
          </span>
          <span
            className={
              inStock
                ? "text-xs font-medium text-emerald-600"
                : "text-xs font-medium text-destructive"
            }
          >
            {inStock ? `${product.stock} in stock` : "Out of Stock"}
          </span>
        </div>

        <div className="mt-2 flex gap-2">
          <Button asChild variant="outline" size="sm" className="flex-1">
            <Link to={`/product/${product.id}`}>View Product</Link>
          </Button>
          <Button
            size="sm"
            className="flex-1"
            disabled={!canAddToCart}
            onClick={handleAddToCart}
            title={
              !inStock
                ? "Out of stock"
                : atStockLimit
                  ? "Maximum available quantity already in cart"
                  : undefined
            }
          >
            <ShoppingCart className="size-4" />
            {atStockLimit ? "Max in Cart" : "Add to Cart"}
          </Button>
        </div>
      </div>
    </div>
  );
}
