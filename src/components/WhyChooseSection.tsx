// src/components/WhyChooseSection.tsx

import {
  ShieldCheck,
  LayoutGrid,
  ShoppingBag,
  Headset,
} from "lucide-react";

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
        <div className="mb-10 max-w-xl">
          <span
            className="inline-block h-1 w-10 rounded-full bg-brand-yellow"
            aria-hidden="true"
          />
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl">
            Why Choose Cosmo
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
            Everything you need to make your next repair job easier.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="group relative overflow-hidden rounded-2xl border border-border bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-brand-navy/15 hover:shadow-lg"
            >
              <span className="flex size-12 items-center justify-center rounded-xl bg-brand-navy/10 text-brand-navy transition-all duration-200 group-hover:bg-brand-red group-hover:text-white">
                <Icon className="size-5" />
              </span>

              <h3 className="mt-5 text-base font-semibold text-foreground">
                {title}
              </h3>

              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {description}
              </p>

              <span
                className="absolute bottom-0 left-0 h-1 w-0 rounded-r-full bg-brand-yellow transition-all duration-300 group-hover:w-14"
                aria-hidden="true"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}