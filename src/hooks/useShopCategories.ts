// src/hooks/useShopCategories.ts
//
// Shared category-loading logic, extracted from Shop.tsx's existing
// pattern so CategoriesSection.tsx, Footer.tsx, and navbar.tsx don't each
// duplicate the same Supabase fetch + fallback logic. Behavior is
// identical to what Shop.tsx already does.

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  getLocalShopCategories,
  mapSupabaseCategory,
  type ShopCategory,
} from "@/lib/category";

interface UseShopCategoriesResult {
  categories: ShopCategory[];
  loading: boolean;
  error: string | null;
}

export function useShopCategories(): UseShopCategoriesResult {
  const [categories, setCategories] = useState<ShopCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("categories")
        .select("id, name, created_at")
        .order("name", { ascending: true });

      if (cancelled) return;

      if (fetchError) {
        setError(
          "Couldn't refresh categories from the server — showing defaults."
        );
        setCategories(getLocalShopCategories());
      } else if (data) {
        setCategories(data.map(mapSupabaseCategory));
      }

      setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return { categories, loading, error };
}