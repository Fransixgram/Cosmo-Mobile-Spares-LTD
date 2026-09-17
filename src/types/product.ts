// src/types/product.ts
//
// Shared shape for every product in the catalogue, regardless of category.
// Category-specific details (compatible model, wattage, color, etc.) live in
// `specs` — a flexible key-value bag — instead of being hard-coded as fixed
// columns. This keeps the type usable for a phone screen AND a soldering
// iron without either one carrying fields that don't apply to it.

export type ProductSpecs = Record<string, string | number | boolean>;

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number; // stored in kobo or naira — decide + document once payments are wired up
  stock: number;
  images: string[];
  category: string;
  specs: ProductSpecs;
  createdAt: string; // ISO date string
  isFeatured?: boolean; // optional — populated from Supabase's is_featured column; undefined for mock data, treated as false
}
