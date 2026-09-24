import { supabase } from "@/lib/supabase";
import {
  mapSupabaseProduct,
  type SupabaseProductRow,
} from "@/lib/supabaseProducts";
import type { Product } from "@/types/product";

export async function fetchActiveProducts(): Promise<Product[]> {
  const [categoriesResult, productsResult] = await Promise.all([
    supabase.from("categories").select("id, name"),
    supabase
      .from("products")
      .select(
        "id, created_at, name, description, price, stock, category_id, slug, image_url, images, compatible_models, colors, specs, is_featured, is_active"
      )
      .eq("is_active", true),
  ]);

  if (productsResult.error) {
    throw productsResult.error;
  }

  const categoryNameById = new Map<number, string>(
    (categoriesResult.data ?? []).map((row) => [row.id, row.name])
  );

  const rows = (productsResult.data ?? []) as SupabaseProductRow[];

  return rows.map((row) =>
    mapSupabaseProduct(row, categoryNameById)
  );
}