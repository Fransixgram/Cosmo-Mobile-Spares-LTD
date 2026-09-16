// src/pages/Contact.tsx
//
// Only confirmed business information is shown here. Phone, WhatsApp,
// email, social links and opening hours are intentionally NOT present —
// those details haven't been supplied yet. The layout leaves obvious
// room for them to be dropped in once they are.

import { MapPin, Store } from "lucide-react";

export default function Contact() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
        Contact Us
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Cosmo Mobile Spares Ltd supplies mobile phone spare parts and repair
        accessories. You're welcome to visit the shop in person.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6">
          <span className="flex size-11 items-center justify-center rounded-full bg-primary/10">
            <MapPin className="size-5 text-primary" />
          </span>
          <h2 className="mt-4 text-sm font-semibold">Shop Address</h2>
          <address className="mt-2 text-sm not-italic leading-relaxed text-muted-foreground">
            Shop 26, Fesrach Plaza,
            <br />
            Back of BRT,
            <br />
            Ikotun,
            <br />
            Lagos State, Nigeria
          </address>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <span className="flex size-11 items-center justify-center rounded-full bg-primary/10">
            <Store className="size-5 text-primary" />
          </span>
          <h2 className="mt-4 text-sm font-semibold">What We Stock</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Complete screens, downboard panels, touch pads, camera glass,
            speakers and earpieces, mouthpieces, SIM trays, soldering irons
            and bits, power flexes, leads, screen gum and paste, charging
            ports, iPhone back glass and iPhone down screws.
          </p>
        </div>
      </div>
    </div>
  );
}
