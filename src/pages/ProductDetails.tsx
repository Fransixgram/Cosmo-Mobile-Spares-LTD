import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ChevronLeft,
  Minus,
  Plus,
  ShoppingCart,
  PackageX,
  Loader2,
  AlertTriangle,
  Check,
  Truck,
  ShieldCheck,
} from "lucide-react";
import type { Product } from "@/types/product";
import {
  mapSupabaseProduct,
  type SupabaseProductRow,
} from "@/lib/supabaseProducts";
import { supabase } from "@/lib/supabase";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/contexts/ToastContext";
import { Button } from "@/components/ui/button";
import ProductCard from "@/components/ProductCard";

const PLACEHOLDER_IMAGE = "/placeholder-product.png";

const PRODUCT_COLUMNS =
  "id, created_at, name, description, price, stock, category_id, slug, image_url, images, compatible_models, colors, specs, is_featured, is_active";

function formatNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatSpecKey(key: string) {
  const spaced = key.replace(/([a-z])([A-Z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export default function ProductDetails() {
  const { id } = useParams<{ id: string }>();
  const { addItem } = useCart();
  const { showToast } = useToast();

  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadProduct() {
      setLoading(true);
      setError(null);
      setProduct(null);
      setRelatedProducts([]);
      setQuantity(1);
      setActiveImageIndex(0);

      const numericId = id ? Number(id) : NaN;

      if (!Number.isInteger(numericId)) {
        setLoading(false);
        return;
      }

      const [categoriesResult, productResult] = await Promise.all([
        supabase.from("categories").select("id, name"),
        supabase
          .from("products")
          .select(PRODUCT_COLUMNS)
          .eq("id", numericId)
          .eq("is_active", true)
          .maybeSingle(),
      ]);

      if (cancelled) return;

      if (productResult.error) {
        setError(
          "Couldn't load this product right now. Please try again shortly."
        );
        setLoading(false);
        return;
      }

      const row = productResult.data as SupabaseProductRow | null;

      if (!row) {
        setLoading(false);
        return;
      }

      const categoryNameById = new Map<number, string>(
        (categoriesResult.data ?? []).map((category) => [
          category.id,
          category.name,
        ])
      );

      setProduct(mapSupabaseProduct(row, categoryNameById));

      if (row.category_id != null) {
        const relatedResult = await supabase
          .from("products")
          .select(PRODUCT_COLUMNS)
          .eq("is_active", true)
          .eq("category_id", row.category_id)
          .neq("id", row.id)
          .limit(4);

        if (!cancelled && relatedResult.data) {
          const relatedRows = relatedResult.data as SupabaseProductRow[];

          setRelatedProducts(
            relatedRows.map((relatedRow) =>
              mapSupabaseProduct(relatedRow, categoryNameById)
            )
          );
        }
      }

      setLoading(false);
    }

    loadProduct();

    return () => {
      cancelled = true;
    };
  }, [id, reloadToken]);

  if (loading) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-24 text-center">
        <Loader2 className="size-7 animate-spin text-brand-red" />
        <p className="mt-4 text-sm text-muted-foreground">
          Loading product…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-24 text-center">
        <span className="flex size-16 items-center justify-center rounded-2xl bg-brand-red/10">
          <AlertTriangle className="size-7 text-brand-red" />
        </span>

        <h1 className="mt-6 text-2xl font-bold tracking-tight text-brand-navy">
          Couldn't load product
        </h1>

        <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
          {error}
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button
            variant="outline"
            size="lg"
            onClick={() => setReloadToken((token) => token + 1)}
          >
            Try Again
          </Button>

          <Button asChild size="lg">
            <Link to="/shop">Back to Shop</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-24 text-center">
        <span className="flex size-16 items-center justify-center rounded-2xl bg-muted">
          <PackageX className="size-7 text-muted-foreground" />
        </span>

        <h1 className="mt-6 text-2xl font-bold tracking-tight text-brand-navy">
          Product not found
        </h1>

        <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
          We couldn't find the product you're looking for. It may have been
          removed or the link may be incorrect.
        </p>

        <Button asChild size="lg" className="mt-6">
          <Link to="/shop">Back to Shop</Link>
        </Button>
      </div>
    );
  }

  const currentProduct = product;

  const images =
    currentProduct.images.length > 0
      ? currentProduct.images
      : [PLACEHOLDER_IMAGE];

  const activeImage = images[activeImageIndex] ?? images[0];
  const inStock = currentProduct.stock > 0;
  const atMax = quantity >= currentProduct.stock;
  const specEntries = Object.entries(currentProduct.specs);

  function handleAddToCart() {
    if (!inStock) return;

    addItem(currentProduct, quantity);
    showToast("Added to cart");
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
        <Link
          to="/shop"
          className="group inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-brand-navy"
        >
          <ChevronLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
          Back to Shop
        </Link>

        <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
          <div>
            <div className="relative overflow-hidden rounded-2xl border border-border bg-muted shadow-sm">
              <div className="aspect-square">
                <img
                  src={activeImage}
                  alt={currentProduct.name}
                  className="h-full w-full object-cover transition-transform duration-300"
                  onError={(event) => {
                    event.currentTarget.src = PLACEHOLDER_IMAGE;
                  }}
                />
              </div>

              <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-brand-navy shadow-sm backdrop-blur">
                {currentProduct.category}
              </span>

              {currentProduct.isFeatured && (
                <span className="absolute right-4 top-4 rounded-full bg-brand-yellow px-3 py-1.5 text-xs font-bold text-brand-navy shadow-sm">
                  Featured
                </span>
              )}
            </div>

            {images.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {images.map((image, index) => (
                  <button
                    key={image + index}
                    type="button"
                    onClick={() => setActiveImageIndex(index)}
                    aria-label={`View image ${index + 1} of ${currentProduct.name}`}
                    className={
                      index === activeImageIndex
                        ? "size-16 shrink-0 overflow-hidden rounded-xl border-2 border-brand-red bg-white shadow-sm sm:size-20"
                        : "size-16 shrink-0 overflow-hidden rounded-xl border border-border bg-white transition-all hover:border-brand-navy/30 sm:size-20"
                    }
                  >
                    <img
                      src={image}
                      alt=""
                      className="h-full w-full object-cover"
                      onError={(event) => {
                        event.currentTarget.src = PLACEHOLDER_IMAGE;
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-brand-red">
              {currentProduct.category}
            </span>

            <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight text-brand-navy sm:text-4xl">
              {currentProduct.name}
            </h1>

            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="text-2xl font-bold text-brand-navy sm:text-3xl">
                {formatNaira(currentProduct.price)}
              </span>

              <span
                className={
                  inStock
                    ? "inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600"
                    : "text-sm font-semibold text-destructive"
                }
              >
                {inStock && <Check className="size-4" />}
                {inStock
                  ? `${currentProduct.stock} in stock`
                  : "Out of Stock"}
              </span>
            </div>

            <div className="mt-6 h-px bg-border" />

            <p className="mt-6 text-sm leading-7 text-muted-foreground sm:text-base">
              {currentProduct.description}
            </p>

            <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-xl border border-border bg-white p-3.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-navy/10 text-brand-navy">
                  <ShieldCheck className="size-4" />
                </span>

                <div>
                  <p className="text-xs font-semibold text-foreground">
                    Quality Parts
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Reliable repair essentials
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-border bg-white p-3.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-red/10 text-brand-red">
                  <Truck className="size-4" />
                </span>

                <div>
                  <p className="text-xs font-semibold text-foreground">
                    Pickup Available
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Convenient local collection
                  </p>
                </div>
              </div>
            </div>

            {specEntries.length > 0 && (
              <div className="mt-7">
                <h2 className="text-base font-bold text-brand-navy">
                  Specifications
                </h2>

                <dl className="mt-3 overflow-hidden rounded-xl border border-border bg-white">
                  {specEntries.map(([key, value], index) => (
                    <div
                      key={key}
                      className={`flex items-start justify-between gap-5 px-4 py-3 text-sm ${
                        index > 0 ? "border-t border-border" : ""
                      }`}
                    >
                      <dt className="text-muted-foreground">
                        {formatSpecKey(key)}
                      </dt>

                      <dd className="max-w-[60%] text-right font-semibold text-foreground">
                        {String(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            <div className="mt-7 rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Quantity
                  </p>

                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setQuantity((q) => Math.max(1, q - 1))
                      }
                      disabled={quantity <= 1}
                      aria-label="Decrease quantity"
                      className="flex size-10 items-center justify-center rounded-full border border-border bg-white transition-colors hover:border-brand-navy/30 hover:bg-brand-navy/5 disabled:pointer-events-none disabled:opacity-40"
                    >
                      <Minus className="size-4" />
                    </button>

                    <span className="w-8 text-center text-base font-bold text-brand-navy">
                      {quantity}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        setQuantity((q) =>
                          Math.min(currentProduct.stock, q + 1)
                        )
                      }
                      disabled={!inStock || atMax}
                      aria-label="Increase quantity"
                      title={atMax ? "Maximum available stock" : undefined}
                      className="flex size-10 items-center justify-center rounded-full border border-border bg-white transition-colors hover:border-brand-navy/30 hover:bg-brand-navy/5 disabled:pointer-events-none disabled:opacity-40"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
                </div>

                <Button
                  size="lg"
                  className="h-11 flex-1"
                  disabled={!inStock}
                  onClick={handleAddToCart}
                >
                  <ShoppingCart className="size-4" />
                  {inStock ? "Add to Cart" : "Out of Stock"}
                </Button>
              </div>

              {inStock && (
                <p className="mt-3 text-center text-xs text-muted-foreground sm:text-left">
                  {currentProduct.stock} unit
                  {currentProduct.stock === 1 ? "" : "s"} currently available.
                </p>
              )}
            </div>
          </div>
        </div>

        {relatedProducts.length > 0 && (
          <section className="mt-16 border-t border-border pt-10 sm:mt-20">
            <div className="mb-6">
              <span
                className="inline-block h-1 w-10 rounded-full bg-brand-yellow"
                aria-hidden="true"
              />

              <h2 className="mt-3 text-2xl font-bold tracking-tight text-brand-navy">
                Related Products
              </h2>

              <p className="mt-1.5 text-sm text-muted-foreground">
                More products from the same category.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {relatedProducts.map((related) => (
                <ProductCard key={related.id} product={related} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
