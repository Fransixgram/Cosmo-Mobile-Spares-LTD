import { Link } from "react-router-dom";
import {
  ArrowRight,
  Battery,
  Camera,
  Cable,
  CheckCircle2,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const repairItems = [
  { icon: Battery, label: "Batteries" },
  { icon: Camera, label: "Cameras" },
  { icon: Wrench, label: "Repair Tools" },
  { icon: Cable, label: "Cables" },
];

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-brand-navy">
      {/* Subtle decorative background glow */}
      <div
        className="pointer-events-none absolute -right-40 -top-40 size-80 rounded-full bg-brand-red/20 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-40 left-1/3 size-80 rounded-full bg-brand-yellow/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto grid max-w-6xl gap-14 px-4 py-12 sm:py-14 lg:grid-cols-2 lg:items-center lg:gap-20 lg:py-16">
        {/* Left content */}
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-brand-yellow backdrop-blur-sm">
            <span
              className="size-1.5 rounded-full bg-brand-yellow"
              aria-hidden="true"
            />
            Cosmo Mobile Spares Ltd
          </div>

          <h1 className="mt-4 max-w-xl text-3xl font-bold leading-[1.12] tracking-tight text-white sm:text-4xl lg:text-[40px]">
            Quality Mobile Phone Spare Parts{" "}
            <span className="relative inline-block">
              &amp; Repair Essentials
              <span
                className="absolute inset-x-0 -bottom-1 h-1 rounded-full bg-brand-yellow"
                aria-hidden="true"
              />
            </span>
          </h1>

          <p className="mt-4 max-w-lg text-sm leading-6 text-white/70 sm:text-base">
            Find reliable phone replacement parts, repair tools and
            accessories for your next repair job.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="group">
              <Link to="/shop">
                Shop Products
                <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>

            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/25 bg-white/5 text-white backdrop-blur-sm hover:bg-white/10 hover:text-white"
            >
              <Link to="/contact">Contact Us</Link>
            </Button>
          </div>

          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-white/60">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-brand-yellow" />
              Quality-focused selection
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-brand-yellow" />
              Pickup available
            </span>
          </div>
        </div>

        {/* Right visual panel */}
        <div className="relative mx-auto w-full max-w-xs lg:ml-auto">
          {/* Floating wrench accent */}
          <div
            className="absolute -right-3 -top-3 z-10 flex size-12 items-center justify-center rounded-xl bg-brand-red shadow-lg"
            aria-hidden="true"
          >
            <Wrench className="size-5 text-white" />
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-white p-2 shadow-2xl">
            <div className="rounded-xl bg-muted/60 p-5 sm:p-6">
              <div className="flex justify-center">
                <div className="relative">
                  <div
                    className="absolute inset-0 scale-125 rounded-full bg-brand-yellow/20 blur-xl"
                    aria-hidden="true"
                  />
                  <img
                    src="/favicon-512.png"
                    alt="Cosmo Mobile Spares logo"
                    className="relative size-20 rounded-full shadow-md sm:size-24"
                  />
                </div>
              </div>

              <div className="mt-4 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-navy/55">
                  Repair essentials
                </p>

                <h2 className="mt-1 text-lg font-bold text-brand-navy">
                  Parts for the job
                </h2>

                <p className="mx-auto mt-1.5 max-w-[220px] text-xs leading-5 text-muted-foreground">
                  Browse available spare parts, tools and accessories.
                </p>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                {repairItems.map(({ icon: Icon, label }) => (
                  <div
                    key={label}
                    className="group flex items-center gap-2 rounded-lg border border-border bg-white p-2 transition-all hover:-translate-y-0.5 hover:border-brand-navy/20 hover:shadow-sm"
                  >
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-brand-navy/10 text-brand-navy transition-colors group-hover:bg-brand-red group-hover:text-white">
                      <Icon className="size-3.5" />
                    </span>

                    <span className="text-[10px] font-semibold leading-tight text-foreground">
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div
            className="absolute -bottom-1.5 left-7 right-7 h-1.5 rounded-full bg-brand-yellow/80"
            aria-hidden="true"
          />
        </div>
      </div>
    </section>
  );
}
