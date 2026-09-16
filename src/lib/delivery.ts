// src/lib/delivery.ts
//
// Placeholder delivery fee. Deliberately NOT a real Cosmos Mobile Spares
// rate — this is a configurable stand-in until real delivery pricing
// (by state, weight, distance, etc.) is defined. Swap this single value
// (or replace getDeliveryFee's logic) once that's decided; nothing else
// in Checkout.tsx needs to change.

export const DELIVERY_FEE_PLACEHOLDER = 0;

export function getDeliveryFee(): number {
  return DELIVERY_FEE_PLACEHOLDER;
}
