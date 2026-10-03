// src/lib/delivery.ts

export type DeliveryMethod = "delivery" | "pickup";

const LAGOS_DELIVERY_FEE = 2000;
const OTHER_STATES_SMALL_FEE = 2000;
const OTHER_STATES_MEDIUM_FEE = 5000;
const OTHER_STATES_LARGE_FEE = 8000;

export function getDeliveryFee(
  deliveryMethod: DeliveryMethod,
  state: string,
  totalQuantity: number,
): number {
  // Pickup is always free.
  if (deliveryMethod === "pickup") {
    return 0;
  }

  // All deliveries within Lagos have a flat ₦2,000 fee,
  // regardless of the number of items.
  if (state.trim().toLowerCase() === "lagos") {
    return LAGOS_DELIVERY_FEE;
  }

  // Other states use quantity-based delivery pricing.
  if (totalQuantity <= 5) {
    return OTHER_STATES_SMALL_FEE;
  }

  if (totalQuantity <= 9) {
    return OTHER_STATES_MEDIUM_FEE;
  }

  return OTHER_STATES_LARGE_FEE;
}
