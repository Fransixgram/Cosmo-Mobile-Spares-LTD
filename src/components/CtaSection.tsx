// src/components/CtaSection.tsx

import { ArrowRight, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function CtaSection() {
  return (
    <section className="relative overflow-hidden border-t border-border bg-white">
      <div
        className="pointer-events-none absolute -left-32 -top-32 size-72 rounded-full bg-brand-red/10 blur-3xl"
        aria-hidden="true"
      />

      <div
        className="pointer-events-none absolute -bottom-40 -right-24 size-80 rounded-full bg-brand-yellow/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-2xl border border-brand-red/10 bg-brand-red/5 text-brand-red">
            <MessageCircle className="size-6" />
          </span>

          <h2 className="mt-5 text-2xl font-bold tracking-tight text-brand-red sm:text-3xl">
            Need a specific spare part?
          </h2>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
            Can't find what you're looking for? Get in touch with Cosmo Mobile
            Spares Ltd and we'll help you find the right part.
          </p>

          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-brand-navy/20 bg-white hover:bg-brand-navy/5 hover:text-brand-navy"
            >
              <Link to="/contact">
                Contact Us
                <MessageCircle className="ml-2 size-4" />
              </Link>
            </Button>

            <Button asChild size="lg" className="group">
              <Link to="/shop">
                Browse Products
                <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}