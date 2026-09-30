import { useEffect, useMemo, useState } from "react";
import {
  Search,
  SlidersHorizontal,
  X,
  PackageX,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import type { Product } from "@/types/product";
import {
  getCategorySlug,
  getLocalShopCategories,
  mapSupabaseCategory,
  type ShopCategory,
} from "@/lib/category";
import {
  mapSupabaseProduct,
  type SupabaseProductRow,
} from "@/lib/supabaseProducts";
import { supabase } from "@/lib/supabase";
import ProductCard from "@/components/ProductCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type SortOption = "featured" | "price-asc" | "price-desc" | "name-asc";

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "name-asc", label: "Name: A-Z" },
];

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("featured");

  const [shopCategories, setShopCategories] = useState<ShopCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCategories() {
      setCategoriesLoading(true);
      setCategoriesError(null);

      const { data, error } = await supabase
        .from("categories")
        .select("id, name, created_at")
        .order("name", { ascending: true });

      if (cancelled) return;

      if (error) {
        setCategoriesError(
          "Couldn't refresh categories from the server — showing defaults."
        );
        setShopCategories(getLocalShopCategories());
      } else if (data) {
        setShopCategories(data.map(mapSupabaseCategory));
      }

      setCategoriesLoading(false);
    }

    loadCategories();

    return () => {
      cancelled = true;
    };
  }, []);

  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      setProductsLoading(true);
      setProductsError(null);

      const [categoriesResult, productsResult] = await Promise.all([
        supabase.from("categories").select("id, name"),
        supabase
          .from("products")
          .select(
            "id, created_at, name, description, price, stock, category_id, slug, image_url, images, compatible_models, colors, specs, is_featured, is_active"
          )
          .eq("is_active", true),
      ]);

      if (cancelled) return;

      if (productsResult.error) {
        setProductsError(
          "Couldn't load products right now. Please try again shortly."
        );
        setProducts([]);
        setProductsLoading(false);
        return;
      }

      const categoryNameById = new Map<number, string>(
        (categoriesResult.data ?? []).map((row) => [row.id, row.name])
      );

      const rows = (productsResult.data ?? []) as SupabaseProductRow[];

      setProducts(
        rows.map((row) => mapSupabaseProduct(row, categoryNameById))
      );

      setProductsLoading(false);
    }

    loadProducts();

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const activeCategorySlug = searchParams.get("category");

  function setCategory(slug: string | null) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);

      if (slug) {
        next.set("category", slug);
      } else {
        next.delete("category");
      }

      return next;
    });
  }

  function resetFilters() {
    setSearchTerm("");
    setSortOption("featured");
    setCategory(null);
  }

  const hasActiveFilters =
    Boolean(activeCategorySlug) || searchTerm.trim() !== "";

  const visibleProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    let result = products.filter((product) => {
      const matchesCategory =
        !activeCategorySlug ||
        getCategorySlug(product.category) === activeCategorySlug;

      const matchesSearch =
        term === "" ||
        product.name.toLowerCase().includes(term) ||
        product.category.toLowerCase().includes(term) ||
        product.description.toLowerCase().includes(term);

      return matchesCategory && matchesSearch;
    });

    result = [...result].sort((a, b) => {
      switch (sortOption) {
        case "price-asc":
          return a.price - b.price;

        case "price-desc":
          return b.price - a.price;

        case "name-asc":
          return a.name.localeCompare(b.name);

        case "featured":
        default:
          return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
      }
    });

    return result;
  }, [products, activeCategorySlug, searchTerm, sortOption]);

  const activeCategoryTitle = shopCategories.find(
    (category) => category.slug === activeCategorySlug
  )?.title;

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8">
          <span
            className="inline-block h-1 w-10 rounded-full bg-brand-yellow"
            aria-hidden="true"
          />

          <h1 className="mt-3 text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl">
            {activeCategoryTitle || "Shop Products"}
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            {activeCategoryTitle
              ? `Browse available ${activeCategoryTitle.toLowerCase()} and related repair essentials.`
              : "Browse our full range of phone spare parts and repair accessories."}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-white p-3 shadow-sm sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search products..."
                aria-label="Search products"
                className="h-10 border-border bg-background pl-9 focus-visible:ring-brand-navy/30"
              />
            </div>

            <div className="flex items-center gap-2">
              <SlidersHorizontal className="size-4 shrink-0 text-muted-foreground" />

              <select
                value={sortOption}
                onChange={(event) =>
                  setSortOption(event.target.value as SortOption)
                }
                aria-label="Sort products"
                className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-brand-navy focus-visible:ring-2 focus-visible:ring-brand-navy/20"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <div className="-mx-4 flex flex-1 gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
            <button
              type="button"
              onClick={() => setCategory(null)}
              className={
                !activeCategorySlug
                  ? "shrink-0 rounded-full bg-brand-red px-4 py-1.5 text-sm font-semibold text-white shadow-sm"
                  : "shrink-0 rounded-full border border-border bg-white px-4 py-1.5 text-sm font-medium text-foreground/80 transition-all hover:border-brand-navy/20 hover:bg-brand-navy/5 hover:text-brand-navy"
              }
            >
              All
            </button>

            {shopCategories.map((category) => (
              <button
                key={category.slug}
                type="button"
                onClick={() => setCategory(category.slug)}
                className={
                  activeCategorySlug === category.slug
                    ? "shrink-0 rounded-full bg-brand-red px-4 py-1.5 text-sm font-semibold text-white shadow-sm"
                    : "shrink-0 rounded-full border border-border bg-white px-4 py-1.5 text-sm font-medium text-foreground/80 transition-all hover:border-brand-navy/20 hover:bg-brand-navy/5 hover:text-brand-navy"
                }
              >
                {category.title}
              </button>
            ))}
          </div>

          {categoriesLoading && (
            <span className="shrink-0 text-xs text-muted-foreground">
              Updating categories…
            </span>
          )}
        </div>

        {categoriesError && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600">
            <AlertTriangle className="size-3.5 shrink-0" />
            <span>{categoriesError}</span>
          </div>
        )}

        {!productsLoading && !productsError && hasActiveFilters && (
          <div className="mt-4 flex items-center gap-3 text-sm text-muted-foreground">
            <span>
              {visibleProducts.length} result
              {visibleProducts.length === 1 ? "" : "s"}
            </span>

            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 text-foreground underline-offset-2 hover:underline"
            >
              <X className="size-3.5" />
              Clear filters
            </button>
          </div>
        )}

        {productsLoading ? (
          <div className="mt-16 flex flex-col items-center text-center">
            <Loader2 className="size-7 animate-spin text-brand-red" />

            <p className="mt-4 text-sm text-muted-foreground">
              Loading products…
            </p>
          </div>
        ) : productsError ? (
          <div className="mt-16 flex flex-col items-center text-center">
            <span className="flex size-16 items-center justify-center rounded-2xl bg-destructive/10">
              <AlertTriangle className="size-7 text-destructive" />
            </span>

            <h2 className="mt-6 text-lg font-semibold">
              Couldn't load products
            </h2>

            <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
              {productsError}
            </p>

            <Button
              variant="outline"
              className="mt-5"
              onClick={() => setReloadToken((token) => token + 1)}
            >
              Try Again
            </Button>
          </div>
        ) : products.length === 0 ? (
          <div className="mt-16 flex flex-col items-center text-center">
            <span className="flex size-16 items-center justify-center rounded-2xl bg-muted">
              <PackageX className="size-7 text-muted-foreground" />
            </span>

            <h2 className="mt-6 text-lg font-semibold">
              Catalogue coming soon
            </h2>

            <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
              We're setting up the product catalogue. Please check back shortly.
            </p>
          </div>
        ) : visibleProducts.length === 0 ? (
          <div className="mt-16 flex flex-col items-center text-center">
            <span className="flex size-16 items-center justify-center rounded-2xl bg-muted">
              <PackageX className="size-7 text-muted-foreground" />
            </span>

            <h2 className="mt-6 text-lg font-semibold">No products found</h2>

            <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
              Try a different search term or category, or clear your filters to
              see everything we carry.
            </p>

            <Button
              variant="outline"
              className="mt-5"
              onClick={resetFilters}
            >
              Reset Filters
            </Button>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visibleProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
