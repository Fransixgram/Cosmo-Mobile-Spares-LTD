// src/pages/AdminProducts.tsx
//
// Admin products list — fetches real Supabase products + categories,
// reusing mapSupabaseProduct (same mapper Shop.tsx/ProductDetails.tsx
// use) for category-name resolution, image fallback, and price parsing.
// No add/edit forms here — those are later phases; this page only lists,
// links out to them, and supports delete.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  AlertTriangle,
  PackageX,
} from "lucide-react";
import type { Product } from "@/types/product";
import { mapSupabaseProduct, type SupabaseProductRow } from "@/lib/supabaseProducts";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/contexts/ToastContext";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";

const PRODUCT_COLUMNS =
  "id, created_at, name, description, price, stock, category_id, slug, image_url, images, compatible_models, colors, specs, is_featured, is_active";

interface AdminProductRow {
  product: Product;
  dbId: number;
  isActive: boolean;
}

function formatNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function AdminProducts() {
  const { showToast } = useToast();

  const [rows, setRows] = useState<AdminProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      setLoading(true);
      setError(null);

      // Admin sees every product regardless of is_active — unlike the
      // customer Shop page, which only shows active ones.
      const [categoriesResult, productsResult] = await Promise.all([
        supabase.from("categories").select("id, name"),
        supabase
          .from("products")
          .select(PRODUCT_COLUMNS)
          .order("created_at", { ascending: false }),
      ]);

      if (cancelled) return;

      if (productsResult.error) {
        setError("Couldn't load products right now. Please try again shortly.");
        setRows([]);
        setLoading(false);
        return;
      }

      const categoryNameById = new Map<number, string>(
        (categoriesResult.data ?? []).map((row) => [row.id, row.name])
      );

      const productRows = (productsResult.data ?? []) as SupabaseProductRow[];
      setRows(
        productRows.map((row) => ({
          product: mapSupabaseProduct(row, categoryNameById),
          dbId: row.id,
          isActive: row.is_active,
        }))
      );
      setLoading(false);
    }

    loadProducts();

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  async function handleDelete(dbId: number, name: string) {
    const confirmed = window.confirm(
      `Delete "${name}"? This cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingId(dbId);
    const { error: deleteError } = await supabase
      .from("products")
      .delete()
      .eq("id", dbId);
    setDeletingId(null);

    if (deleteError) {
      showToast("Couldn't delete product. Please try again.");
      return;
    }

    setRows((prev) => prev.filter((row) => row.dbId !== dbId));
    showToast("Product deleted");
  }

  return (
    <AdminLayout title="Products">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Manage the Cosmo Mobile Spares product catalogue.
        </p>
        <Button asChild size="sm" className="gap-1.5">
          <Link to="/admin/products/new">
            <Plus className="size-4" />
            Add Product
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="mt-16 flex flex-col items-center text-center">
          <Loader2 className="size-7 animate-spin text-muted-foreground" />
          <p className="mt-4 text-sm text-muted-foreground">
            Loading products…
          </p>
        </div>
      ) : error ? (
        <div className="mt-16 flex flex-col items-center text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="size-7 text-destructive" />
          </span>
          <h2 className="mt-6 text-lg font-semibold">
            Couldn't load products
          </h2>
          <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
            {error}
          </p>
          <Button
            variant="outline"
            className="mt-5"
            onClick={() => setReloadToken((token) => token + 1)}
          >
            Try Again
          </Button>
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-16 flex flex-col items-center text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-muted">
            <PackageX className="size-7 text-muted-foreground" />
          </span>
          <h2 className="mt-6 text-lg font-semibold">No products yet</h2>
          <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
            You haven't added any products to the catalogue yet.
          </p>
          <Button asChild size="lg" className="mt-6 gap-1.5">
            <Link to="/admin/products/new">
              <Plus className="size-4" />
              Add Product
            </Link>
          </Button>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Stock</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map(({ product, dbId, isActive }) => (
                <tr key={dbId}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="size-10 shrink-0 rounded-lg object-cover"
                        onError={(event) => {
                          event.currentTarget.src = "/placeholder-product.png";
                        }}
                      />
                      <span className="font-medium">{product.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {product.category}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {formatNaira(product.price)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {product.stock}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        isActive
                          ? "inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700"
                          : "inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
                      }
                    >
                      {isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Button asChild variant="outline" size="sm" className="gap-1.5">
                        <Link to={`/admin/products/${dbId}/edit`}>
                          <Pencil className="size-3.5" />
                          Edit
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        disabled={deletingId === dbId}
                        onClick={() => handleDelete(dbId, product.name)}
                      >
                        <Trash2 className="size-3.5" />
                        {deletingId === dbId ? "Deleting…" : "Delete"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
