import {
  MapPin,
  Store,
  Phone,
  MessageCircle,
  Mail,
  Clock,
} from "lucide-react";

export default function Contact() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
        Contact Us
      </h1>

      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Cosmo Mobile Spares Ltd supplies mobile phone spare parts and repair
        accessories. You're welcome to visit the shop in person, or reach us
        using any of the details below.
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
            <Clock className="size-5 text-primary" />
          </span>

          <h2 className="mt-4 text-sm font-semibold">Opening Hours</h2>

          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            8:30am – 7:00pm, daily
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <span className="flex size-11 items-center justify-center rounded-full bg-primary/10">
            <Phone className="size-5 text-primary" />
          </span>

          <h2 className="mt-4 text-sm font-semibold">Phone</h2>

          <ul className="mt-2 space-y-1 text-sm leading-relaxed text-muted-foreground">
            <li>
              <a href="tel:+2347065561461" className="hover:text-primary">
                0706 556 1461
              </a>
            </li>

            <li>
              <a href="tel:+2348123237338" className="hover:text-primary">
                0812 323 7338
              </a>
            </li>

            <li>
              <a href="tel:+2347060513799" className="hover:text-primary">
                0706 051 3799
              </a>
            </li>
          </ul>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <span className="flex size-11 items-center justify-center rounded-full bg-primary/10">
            <MessageCircle className="size-5 text-primary" />
          </span>

          <h2 className="mt-4 text-sm font-semibold">WhatsApp</h2>

          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            <a
              href="https://wa.me/2347065561461"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary"
            >
              0706 556 1461
            </a>
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <span className="flex size-11 items-center justify-center rounded-full bg-primary/10">
            <Mail className="size-5 text-primary" />
          </span>

          <h2 className="mt-4 text-sm font-semibold">Email</h2>

          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            <a
              href="mailto:Cosmophoneparts@gmail.com"
              className="hover:text-primary"
            >
              Cosmophoneparts@gmail.com
            </a>
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <span className="flex size-11 items-center justify-center rounded-full bg-primary/10">
            <Store className="size-5 text-primary" />
          </span>

          <h2 className="mt-4 text-sm font-semibold">What We Stock</h2>

          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Phone screens, phone accessories, soldering tools, charging
            ports, phone speakers &amp; earpieces, touch pads, camera glass,
            SIM trays, power flexes, screen gum &amp; paste, soldering bits,
            mouthpieces, leads, iPhone back glass, iPhone down screws, and
            downboard panels.
          </p>
        </div>
      </div>
    </div>
  );
}