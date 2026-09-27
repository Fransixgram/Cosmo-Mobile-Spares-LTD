// src/pages/About.tsx

import { ShieldCheck, Wrench, Users, Heart } from "lucide-react";

export default function About() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
        About Cosmo Mobile Spares
      </h1>

      <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">
        Cosmo Mobile Spares Ltd supplies high-quality phone screen spare
        parts and other smartphone components. We're based at Shop 26,
        Fesrach Plaza, Back of BRT, Ikotun, Lagos State, and we serve
        customers across Lagos and other Nigerian states.
      </p>

      <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6">
          <span className="flex size-11 items-center justify-center rounded-full bg-primary/10">
            <Wrench className="size-5 text-primary" />
          </span>

          <h2 className="mt-4 text-sm font-semibold">
            Phone Repair Technicians
          </h2>

          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Reliable, quality parts for professionals doing repairs day to
            day.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <span className="flex size-11 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="size-5 text-primary" />
          </span>

          <h2 className="mt-4 text-sm font-semibold">Engineers</h2>

          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Precise components for engineering and technical work on mobile
            devices.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <span className="flex size-11 items-center justify-center rounded-full bg-primary/10">
            <Users className="size-5 text-primary" />
          </span>

          <h2 className="mt-4 text-sm font-semibold">Retailers</h2>

          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Consistent stock and fair pricing for shops selling parts and
            accessories on to their own customers.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <span className="flex size-11 items-center justify-center rounded-full bg-primary/10">
            <Heart className="size-5 text-primary" />
          </span>

          <h2 className="mt-4 text-sm font-semibold">Individual Customers</h2>

          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Genuine parts and friendly guidance for anyone getting their own
            phone fixed.
          </p>
        </div>
      </div>

      <div className="mt-10 rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold">What Sets Us Apart</h2>

        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Good customer service is what we're known for. Whether you're
          picking up a single part or stocking up for your shop, we aim to
          make sure you get the right component and the support you need
          to get the job done.
        </p>
      </div>
    </div>
  );
}
