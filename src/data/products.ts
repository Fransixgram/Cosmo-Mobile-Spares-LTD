// src/data/products.ts
//
// ⚠️ TEMPORARY / MOCK DATA ⚠️
// This is placeholder data used to build and test the UI before the
// Supabase database is connected. Once Supabase is wired up, product data
// will come from the database instead, and this file (or its export) will
// be removed. Do not treat these as real prices, stock levels, or images.

import type { Product } from "../types/product";

export const mockProducts: Product[] = [
  {
    id: "1",
    name: "iPhone 13 OLED Screen Replacement",
    slug: "iphone-13-oled-screen",
    description:
      "Full OLED display assembly for iPhone 13, OEM quality, includes digitizer.",
    price: 45000,
    stock: 12,
    images: ["/placeholder-product.png"],
    category: "Complete Screens",
    specs: {
      compatibleModel: "iPhone 13",
      quality: "OEM",
      color: "Black",
      screenType: "OLED",
    },
    createdAt: "2026-08-01T00:00:00.000Z",
  },
  {
    id: "2",
    name: "Samsung A12 Touch Pad",
    slug: "samsung-a12-touch-pad",
    description: "Replacement digitizer/touch pad for Samsung Galaxy A12.",
    price: 8500,
    stock: 30,
    images: ["/placeholder-product.png"],
    category: "Touch Pads",
    specs: {
      compatibleModel: "Samsung Galaxy A12",
      quality: "Aftermarket",
    },
    createdAt: "2026-08-01T00:00:00.000Z",
  },
  {
    id: "3",
    name: "60W Temperature-Controlled Soldering Iron",
    slug: "60w-soldering-iron",
    description:
      "Adjustable temperature soldering iron, suitable for phone repair work.",
    price: 12000,
    stock: 20,
    images: ["/placeholder-product.png"],
    category: "Soldering Tools",
    specs: {
      power: "60W",
      type: "Temperature Controlled",
    },
    createdAt: "2026-08-01T00:00:00.000Z",
  },
  {
    id: "4",
    name: "iPhone 12 Back Glass",
    slug: "iphone-12-back-glass",
    description: "Rear glass panel replacement for iPhone 12.",
    price: 15000,
    stock: 18,
    images: ["/placeholder-product.png"],
    category: "iPhone Back Glass",
    specs: {
      compatibleModel: "iPhone 12",
      color: "Blue",
    },
    createdAt: "2026-08-01T00:00:00.000Z",
  },
  {
    id: "5",
    name: "Universal Charging Port Flex (Type-C)",
    slug: "universal-charging-port-type-c",
    description: "Type-C charging port flex cable, fits multiple Android models.",
    price: 3500,
    stock: 50,
    images: ["/placeholder-product.png"],
    category: "Charging Ports",
    specs: {
      connectorType: "USB Type-C",
    },
    createdAt: "2026-08-01T00:00:00.000Z",
  },
  {
    id: "6",
    name: "Screen Adhesive Gum Roll",
    slug: "screen-adhesive-gum-roll",
    description: "Pre-cut adhesive gum for screen reassembly, 1 roll.",
    price: 1500,
    stock: 100,
    images: ["/placeholder-product.png"],
    category: "Screen Gum / Paste",
    specs: {
      length: "1m",
    },
    createdAt: "2026-08-01T00:00:00.000Z",
  },
];
