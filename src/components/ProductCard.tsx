// src/components/ProductCard.tsx

import { Link } from "react-router-dom";
import { ArrowUpRight, ShoppingCart } from "lucide-react";
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
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-brand-navy/15 hover:shadow-lg">
      <Link
        to={`/product/${product.id}`}
        className="relative block aspect-square overflow-hidden bg-muted"
      >
        <img
          src={product.images[0]}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />

        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-brand-navy shadow-sm">
          {product.category}
        </span>

        <span
          className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full bg-white/95 text-brand-navy opacity-0 shadow-sm transition-all duration-200 group-hover:opacity-100"
          aria-hidden="true"
        >
          <ArrowUpRight className="size-4" />
        </span>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <Link to={`/product/${product.id}`} className="group/title">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground transition-colors group-hover/title:text-brand-navy">
            {product.name}
          </h3>
        </Link>

        <div className="mt-3 flex items-end justify-between gap-3">
          <span className="text-lg font-bold text-brand-navy">
            {formatNaira(product.price)}
          </span>

          <span
            className={
              inStock
                ? "text-[11px] font-semibold text-emerald-600"
                : "text-[11px] font-semibold text-destructive"
            }
          >
            {inStock ? `${product.stock} in stock` : "Out of Stock"}
          </span>
        </div>

        <div className="mt-4 flex gap-2">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="flex-1 border-brand-navy/20 hover:bg-brand-navy/5 hover:text-brand-navy"
          >
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
    </article>
  );
}