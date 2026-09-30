// src/components/CategoriesSection.tsx

import { useShopCategories } from "@/hooks/useShopCategories";
import CategoryCard from "@/components/CategoryCard";

export default function CategoriesSection() {
  const { categories, loading } = useShopCategories();

  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-8">
          <span className="inline-block h-1 w-10 rounded-full bg-brand-yellow" aria-hidden="true" />
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl">
            Shop by Category
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Find the right part for the job, faster.
          </p>
        </div>

        {loading ? (
          <div
            className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
            aria-hidden="true"
          >
            {Array.from({ length: 10 }).map((_, index) => (
              <div
                key={index}
                className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-5"
              >
                <div className="size-12 animate-pulse rounded-full bg-muted" />
                <div className="h-3 w-16 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {categories.map((category) => (
              <CategoryCard key={category.slug} category={category} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
