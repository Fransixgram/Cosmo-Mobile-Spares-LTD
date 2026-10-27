import { Link } from "react-router-dom";
import {
  ArrowRight,
  Headset,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const trustPoints = [
  { icon: ShieldCheck, title: "Genuine Parts", subtitle: "Trusted quality" },
  { icon: Truck, title: "Fast Delivery", subtitle: "Across Nigeria" },
  { icon: Headset, title: "Reliable Support", subtitle: "We're here to help" },
];

export default function HeroSection() {
  return (
    <section className="relative isolate overflow-hidden bg-[#050b32] text-white">
      {/* Blurred background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-20 scale-105 bg-cover bg-center blur-[5px]"
        style={{ backgroundImage: "url('/cosmo-hero-background.png')" }}
      />

      {/* Dark overlay for readability */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(90deg, rgba(3,8,39,.97) 0%, rgba(5,13,49,.91) 43%, rgba(5,11,50,.65) 100%), linear-gradient(0deg, rgba(5,11,50,.55), rgba(5,11,50,.15))",
        }}
      />

      {/* Subtle background pattern */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-25"
        style={{
          backgroundImage:
            "radial-gradient(circle, #8eb4ff 1.5px, transparent 2px)",
          backgroundSize: "22px 22px",
          maskImage: "linear-gradient(90deg, black, transparent 30%)",
        }}
      />

      <div className="relative mx-auto grid max-w-[1280px] items-center gap-8 px-5 pb-12 pt-8 sm:px-8 sm:py-12 lg:min-h-[500px] lg:grid-cols-[1fr_1fr] lg:gap-8 lg:px-8 lg:py-10">
        {/* Hero text */}
        <div className="relative z-10 max-w-[650px]">
          <div className="inline-flex items-center rounded-full bg-brand-red px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] shadow-lg shadow-red-950/30 sm:text-xs">
            Your one-stop shop
          </div>

          <h1 className="mt-4 text-[2rem] font-extrabold leading-[1.12] tracking-tight sm:text-4xl lg:text-[2.8rem] xl:text-5xl">
            Quality Mobile Spare Parts
            <span className="mt-1 block text-brand-red">
              for Every Device
            </span>
          </h1>

          <p className="mt-4 max-w-[540px] text-sm leading-6 text-blue-50/90 sm:text-base sm:leading-7">
            We supply genuine and high-quality mobile spare parts,
            accessories and tools for all your repair and maintenance needs.
          </p>

          <div className="mt-6">
            <Button
              asChild
              size="lg"
              className="group h-12 rounded-full bg-brand-red px-7 text-sm font-bold text-white shadow-lg shadow-red-950/30 hover:bg-brand-red/90 sm:px-8"
            >
              <Link to="/shop">
                Shop Now
                <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>

          {/* Trust points */}
          <div className="mt-7 grid grid-cols-1 gap-4 border-t border-white/10 pt-5 sm:grid-cols-3 sm:gap-0 sm:border-t-0 sm:pt-0">
            {trustPoints.map(({ icon: Icon, title, subtitle }, index) => (
              <div
                key={title}
                className={`flex items-center gap-3 sm:pr-4 ${
                  index > 0 ? "sm:border-l sm:border-white/20 sm:pl-5" : ""
                }`}
              >
                <Icon
                  aria-hidden="true"
                  className="size-7 shrink-0 text-brand-red sm:size-8"
                  strokeWidth={2}
                />
                <div>
                  <p className="text-sm font-bold text-white">{title}</p>
                  <p className="mt-1 text-xs text-blue-100/80">{subtitle}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Crisp flyer image */}
        <div className="relative z-10 mx-auto w-full max-w-[560px] lg:ml-auto lg:mr-0">
          <div
            aria-hidden="true"
            className="absolute -inset-5 rounded-[2.5rem] bg-blue-500/20 blur-3xl"
          />

          <div
            aria-hidden="true"
            className="absolute -inset-x-2 bottom-2 top-7 rotate-[-3deg] rounded-[1.75rem] bg-brand-red/80 shadow-2xl"
          />

          <div className="relative overflow-hidden rounded-2xl border border-white/20 bg-white p-1.5 shadow-2xl shadow-black/40 sm:rounded-[1.5rem] sm:p-2">
            <img
              src="/cosmo-mobile-flyer.jpg"
              alt="Cosmo Mobile Spares Ltd flyer featuring mobile phone replacement parts, repair tools and accessories"
              fetchPriority="high"
              className="block h-auto max-h-[400px] w-full rounded-xl object-contain sm:rounded-[1.25rem]"
            />
          </div>

          <div
            aria-hidden="true"
            className="absolute -bottom-4 left-[12%] right-[12%] h-1.5 rounded-full bg-brand-red shadow-[0_0_20px_rgba(237,28,36,.6)]"
          />
        </div>
      </div>

      {/* Curved transition into the next section */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-8 left-[-5%] h-12 w-[110%] rounded-[50%_50%_0_0] bg-background sm:-bottom-10 sm:h-16"
      />
    </section>
  );
}
