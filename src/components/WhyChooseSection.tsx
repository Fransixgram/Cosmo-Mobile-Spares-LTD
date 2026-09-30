// src/components/WhyChooseSection.tsx

import { ShieldCheck, LayoutGrid, ShoppingBag, Headset } from "lucide-react";

const benefits = [
  {
    icon: ShieldCheck,
    title: "Quality Parts",
    description: "Reliable replacement parts and repair essentials.",
  },
  {
    icon: LayoutGrid,
    title: "Wide Selection",
    description: "Multiple categories for different phone repair needs.",
  },
  {
    icon: ShoppingBag,
    title: "Convenient Shopping",
    description: "Browse products and place orders from anywhere.",
  },
  {
    icon: Headset,
    title: "Customer Support",
    description: "Reach out directly whenever you need help.",
  },
];

export default function WhyChooseSection() {
  return (
    <section className="border-b border-border bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-8">
          <span className="inline-block h-1 w-10 rounded-full bg-brand-yellow" aria-hidden="true" />
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl">
            Why Choose Cosmo
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-xl border border-border bg-white p-6 shadow-sm"
            >
              <span className="flex size-11 items-center justify-center rounded-full bg-brand-navy/10 text-brand-navy">
                <Icon className="size-5" />
              </span>
              <h3 className="mt-4 text-sm font-semibold text-foreground">{title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
