// src/components/CtaSection.tsx

import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function CtaSection() {
  return (
    <section className="bg-background">
      <div className="mx-auto max-w-6xl px-4 py-16 text-center">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Need a specific spare part?
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
          Can't find what you're looking for? Get in touch with Cosmo Mobile
          Spares Ltd and we'll help you find the right part.
        </p>

        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild variant="outline" size="lg">
            <Link to="/contact">Contact Us</Link>
          </Button>
          <Button asChild size="lg">
            <Link to="/shop">Browse Products</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
