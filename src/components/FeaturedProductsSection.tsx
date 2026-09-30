// src/components/FeaturedProductsSection.tsx
//
// Fetches real Supabase products (is_active = true), preferring
// is_featured = true ones, up to 6 — mockProducts is no longer used here.
// Reuses mapSupabaseProduct, the same mapper Shop.tsx/ProductDetails.tsx
// use, and the same categories fetch pattern for category_id -> name
// resolution — no second product/category system.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Product } from "@/types/product";
import { mapSupabaseProduct, type SupabaseProductRow } from "@/lib/supabaseProducts";
import { supabase } from "@/lib/supabase";
import ProductCard from "@/components/ProductCard";

const PRODUCT_COLUMNS =
  "id, created_at, name, description, price, stock, category_id, slug, image_url, images, compatible_models, colors, specs, is_featured, is_active";

export default function FeaturedProductsSection() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadFeatured() {
      setLoading(true);

      const [categoriesResult, productsResult] = await Promise.all([
        supabase.from("categories").select("id, name"),
        supabase
          .from("products")
          .select(PRODUCT_COLUMNS)
          .eq("is_active", true)
          .order("is_featured", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(6),
      ]);

      if (cancelled) return;

      if (!productsResult.error && productsResult.data) {
        const categoryNameById = new Map<number, string>(
          (categoriesResult.data ?? []).map((row) => [row.id, row.name])
        );
        const rows = productsResult.data as SupabaseProductRow[];
        setProducts(rows.map((row) => mapSupabaseProduct(row, categoryNameById)));
      }
      // On error, `products` simply stays empty and the section renders
      // nothing below — a quiet degrade rather than an error block on the
      // homepage.

      setLoading(false);
    }

    loadFeatured();

    return () => {
      cancelled = true;
    };
  }, []);

  // Nothing to show yet (still loading with no data) or genuinely no
  // active products — skip the section cleanly rather than showing an
  // empty/broken block on the homepage.
  if (!loading && products.length === 0) return null;

  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="inline-block h-1 w-10 rounded-full bg-brand-yellow" aria-hidden="true" />
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl">
              Featured Products
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              A few of what we currently have in stock.
            </p>
          </div>
          <Link
            to="/shop"
            className="text-sm font-medium text-primary hover:underline"
          >
            View All Products &rarr;
          </Link>
        </div>

        {loading ? (
          <div
            className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
            aria-hidden="true"
          >
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-xl border border-border"
              >
                <div className="aspect-square animate-pulse bg-muted" />
                <div className="space-y-2 p-4">
                  <div className="h-3 w-16 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
