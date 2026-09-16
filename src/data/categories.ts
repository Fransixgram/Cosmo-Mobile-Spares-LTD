// src/data/categories.ts
//
// Category list for Cosmo Mobile Spares Ltd's product range. This is the
// single source of truth for categories — the navbar dropdown, the Home
// page category cards, the Shop filters and the footer all read from it.
//
// Slugs are used as the ?category= query param on /shop, and each
// category's `title` must exactly match the `category` field on products
// in products.ts for filtering to work.

import type { LucideIcon } from "lucide-react";
import {
  Smartphone,
  CircuitBoard,
  Fingerprint,
  Camera,
  Volume2,
  Mic,
  CreditCard,
  Wrench,
  Cable,
  Usb,
  Droplet,
  BatteryCharging,
  Layers,
  Bolt,
} from "lucide-react";

export interface Category {
  title: string;
  slug: string;
  icon: LucideIcon;
}

export const categories: Category[] = [
  { title: "Complete Screens", slug: "screens", icon: Smartphone },
  { title: "Downboard Panels", slug: "downboard-panels", icon: CircuitBoard },
  { title: "Touch Pads", slug: "touch-pads", icon: Fingerprint },
  { title: "Camera Glass", slug: "camera-glass", icon: Camera },
  { title: "Speakers & Earpieces", slug: "speakers", icon: Volume2 },
  { title: "Mouthpieces", slug: "mouthpieces", icon: Mic },
  { title: "SIM Trays", slug: "sim-trays", icon: CreditCard },
  { title: "Soldering Tools", slug: "soldering-tools", icon: Wrench },
  { title: "Power Flexes", slug: "power-flexes", icon: Cable },
  { title: "Leads", slug: "leads", icon: Usb },
  { title: "Screen Gum / Paste", slug: "screen-gum", icon: Droplet },
  { title: "Charging Ports", slug: "charging-ports", icon: BatteryCharging },
  { title: "iPhone Back Glass", slug: "back-glass", icon: Layers },
  { title: "iPhone Down Screws", slug: "down-screws", icon: Bolt },
];
