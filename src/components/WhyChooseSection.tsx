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
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Why Choose Cosmo
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-xl border border-border bg-card p-6"
            >
              <span className="flex size-11 items-center justify-center rounded-full bg-primary/10">
                <Icon className="size-5 text-primary" />
              </span>
              <h3 className="mt-4 text-sm font-semibold">{title}</h3>
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
