// src/lib/supabaseProducts.ts
//
// Maps a row from Supabase's public.products table into the existing
// Product type (src/types/product.ts), so the rest of the app — Shop,
// ProductCard, cart, etc. — can keep working against the same shape it
// already understands, regardless of where the data came from.

import type { Product, ProductSpecs } from "@/types/product";

/** Shape of a row as returned by Supabase's public.products table. */
export interface SupabaseProductRow {
  id: number;
  created_at: string;
  name: string;
  description: string | null;
  price: number | string; // numeric columns can come back as strings
  stock: number;
  category_id: number | null;
  slug: string;
  image_url: string | null;
  images: string[] | null;
  compatible_models: string[] | null;
  colors: string[] | null;
  specs: Record<string, unknown> | null;
  is_featured: boolean;
  is_active: boolean;
}

const PLACEHOLDER_IMAGE = "/placeholder-product.png";

function toProductSpecs(raw: Record<string, unknown> | null): ProductSpecs {
  if (!raw) return {};

  const specs: ProductSpecs = {};
  for (const [key, value] of Object.entries(raw)) {
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      specs[key] = value;
    }
    // Non-primitive values (nested objects/arrays) are skipped rather than
    // guessed at — ProductSpecs is intentionally a flat key/value bag.
  }
  return specs;
}

/**
 * @param row a row from public.products
 * @param categoryNameById maps category_id -> category name, so the
 *   existing `Product.category` string field can still be populated.
 *   Unknown/missing category_id falls back to "Uncategorized" rather than
 *   throwing.
 */
export function mapSupabaseProduct(
  row: SupabaseProductRow,
  categoryNameById: Map<number, string>
): Product {
  const images =
    row.images && row.images.length > 0
      ? row.images
      : row.image_url
        ? [row.image_url]
        : [PLACEHOLDER_IMAGE];

  const category =
    row.category_id != null
      ? (categoryNameById.get(row.category_id) ?? "Uncategorized")
      : "Uncategorized";

  const specs = toProductSpecs(row.specs);
  if (row.compatible_models && row.compatible_models.length > 0) {
    specs.compatibleModels = row.compatible_models.join(", ");
  }
  if (row.colors && row.colors.length > 0) {
    specs.colors = row.colors.join(", ");
  }

  return {
    id: String(row.id),
    name: row.name,
    slug: row.slug,
    description: row.description ?? "",
    price: typeof row.price === "string" ? parseFloat(row.price) : row.price,
    stock: row.stock,
    images,
    category,
    specs,
    createdAt: row.created_at,
    isFeatured: row.is_featured,
  };
}
