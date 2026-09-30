// src/components/HeroSection.tsx
//
// Styling-only redesign for the Cosmo brand system. Same content, same
// routes/actions as before. Uses the real Cosmo logo already in
// public/favicon-512.png instead of inventing new imagery.

import { Link } from "react-router-dom";
import { Battery, Camera, Wrench, Cable } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-brand-navy">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:py-20 lg:grid-cols-2 lg:items-center lg:py-28">
        <div>
          <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-yellow">
            Cosmo Mobile Spares Ltd
          </span>

          <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Quality Mobile Phone Spare Parts{" "}
            <span className="relative inline-block">
              &amp; Repair Essentials
              <span
                className="absolute inset-x-0 -bottom-1 h-1.5 rounded-full bg-brand-yellow"
                aria-hidden="true"
              />
            </span>
          </h1>

          <p className="mt-5 max-w-xl text-base text-white/80 sm:text-lg">
            Find reliable phone replacement parts, repair tools and
            accessories for your next repair job.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link to="/shop">Shop Products</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <Link to="/contact">Contact Us</Link>
            </Button>
          </div>
        </div>

        {/* Brand panel — real Cosmo logo + icon grid */}
        <div className="relative mx-auto w-full max-w-sm">
          <div className="rounded-2xl border border-white/10 bg-white p-8 shadow-xl">
            <div className="flex items-center justify-center rounded-xl bg-muted p-6">
              <img
                src="/favicon-512.png"
                alt="Cosmo Mobile Spares logo"
                className="size-24 rounded-full"
              />
            </div>
            <div className="mt-6 grid grid-cols-4 gap-3">
              <div className="flex items-center justify-center rounded-lg bg-muted p-3">
                <Battery className="size-5 text-brand-navy" />
              </div>
              <div className="flex items-center justify-center rounded-lg bg-muted p-3">
                <Camera className="size-5 text-brand-navy" />
              </div>
              <div className="flex items-center justify-center rounded-lg bg-muted p-3">
                <Wrench className="size-5 text-brand-navy" />
              </div>
              <div className="flex items-center justify-center rounded-lg bg-muted p-3">
                <Cable className="size-5 text-brand-navy" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
