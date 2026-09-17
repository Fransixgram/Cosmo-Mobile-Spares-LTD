// src/lib/category.ts

import type { LucideIcon } from "lucide-react";
import { Tag } from "lucide-react";
import { categories, type Category } from "@/data/categories";

function normalize(value: string): string {
  return value.toLowerCase().trim();
}

/**
 * Maps a category label (e.g. a product's category field, or a Supabase
 * categories.name value) to its canonical slug, using the shared
 * `categories` list as the source of truth. Deliberately does NOT require
 * exact string equality, since the mock product data and the Supabase
 * category names aren't guaranteed to be worded identically:
 *
 *  1. Exact match (case-insensitive) against a known category title.
 *  2. Substring match either direction (case-insensitive) — e.g. "Screen"
 *     matching "Complete Screens" — so reasonable naming variations still
 *     resolve to the correct canonical slug instead of a wrong new one.
 *  3. Falls back to a naive slugify for a genuinely unrecognized label,
 *     rather than throwing.
 */
export function getCategorySlug(label: string): string {
  const normalizedLabel = normalize(label);

  const exact = categories.find(
    (category) => normalize(category.title) === normalizedLabel
  );
  if (exact) return exact.slug;

  const partial = categories.find((category) => {
    const normalizedTitle = normalize(category.title);
    return (
      normalizedTitle.includes(normalizedLabel) ||
      normalizedLabel.includes(normalizedTitle)
    );
  });
  if (partial) return partial.slug;

  return normalizedLabel.replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/** Minimal shape of a row from Supabase's `categories` table. */
export interface SupabaseCategoryRow {
  id: string | number;
  name: string;
  created_at?: string;
}

/** A category ready to render as a Shop filter button/pill. */
export interface ShopCategory {
  id: string | number | null;
  title: string;
  slug: string;
  icon: LucideIcon;
}

/**
 * Maps a Supabase categories row into the shape the Shop page's filter
 * pills render. The slug is resolved via getCategorySlug (fuzzy match, not
 * exact equality) so it lines up with the canonical ?category= slugs
 * already used across the site. If no local icon mapping is found for a
 * category, a generic fallback icon is used rather than failing.
 */
export function mapSupabaseCategory(row: SupabaseCategoryRow): ShopCategory {
  const slug = getCategorySlug(row.name);
  const localMatch = categories.find((category) => category.slug === slug);

  return {
    id: row.id,
    title: row.name,
    slug,
    icon: localMatch?.icon ?? Tag,
  };
}

/** The local category list, in the same shape Shop's pills expect. */
export function getLocalShopCategories(): ShopCategory[] {
  return categories.map((category: Category) => ({
    id: null,
    title: category.title,
    slug: category.slug,
    icon: category.icon,
  }));
}
