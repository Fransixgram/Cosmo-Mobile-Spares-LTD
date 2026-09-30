// src/components/CategoryCard.tsx

import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
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
      className="group relative flex min-h-[150px] flex-col items-center justify-center overflow-hidden rounded-2xl border border-border bg-white p-5 text-center shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-brand-navy/20 hover:shadow-lg"
    >
      <span
        className="absolute right-3 top-3 flex size-7 items-center justify-center rounded-full bg-muted text-muted-foreground opacity-0 transition-all duration-200 group-hover:bg-brand-red group-hover:text-white group-hover:opacity-100"
        aria-hidden="true"
      >
        <ArrowUpRight className="size-3.5" />
      </span>

      <span className="flex size-14 items-center justify-center rounded-2xl bg-brand-navy/10 text-brand-navy transition-all duration-200 group-hover:scale-105 group-hover:bg-brand-red group-hover:text-white">
        <Icon className="size-6" />
      </span>

      <span className="mt-4 text-sm font-semibold leading-tight text-foreground transition-colors group-hover:text-brand-navy">
        {category.title}
      </span>

      <span
        className="absolute bottom-0 left-1/2 h-1 w-0 -translate-x-1/2 rounded-full bg-brand-yellow transition-all duration-200 group-hover:w-12"
        aria-hidden="true"
      />
    </Link>
  );
}