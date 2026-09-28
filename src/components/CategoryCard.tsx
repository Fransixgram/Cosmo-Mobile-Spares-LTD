// src/components/CategoryCard.tsx
//
// Reusable card for a single product category. Links to the Shop page
// filtered by category via a query param — no separate category pages.

import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";

interface CategoryCardProps {
  category: {
    title: string;
    slug: string;
    icon: LucideIcon;
  };
}

export default function CategoryCard({ category }: CategoryCardProps) {
  const Icon = category.icon;

  return (
    <Link
      to={`/shop?category=${category.slug}`}
      className="group flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-5 text-center transition-colors hover:border-primary/40 hover:bg-accent"
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-muted transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        <Icon className="size-5" />
      </span>
      <span className="text-sm font-medium leading-tight">{category.title}</span>
    </Link>
  );
}
