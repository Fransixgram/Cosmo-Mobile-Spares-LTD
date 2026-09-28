// src/pages/Checkout.tsx
//
// Real checkout: creates an order + order_items via the create-order Edge
// Function (server-side, avoids RLS insert-then-read conflicts for guest
// checkout), then opens Paystack's Inline popup for payment. On successful
// payment, calls the verify-paystack-payment Edge Function (which holds
// the secret key) to confirm the payment server-side and mark the order
// paid. Supports both delivery and in-store pickup.

import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ShoppingBag, CreditCard, CheckCircle2, MapPin } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/contexts/ToastContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getDeliveryFee } from "@/lib/delivery";
import { supabase } from "@/lib/supabase";

// Safe to expose in frontend code — this is Paystack's PUBLIC key.
const PAYSTACK_PUBLIC_KEY = "pk_test_633918ab7d2c20858c10db9ec1eb054aa447b409";

declare global {
  interface Window {
    PaystackPop?: {
      setup: (options: PaystackSetupOptions) => { openIframe: () => void };
    };
  }
}

interface PaystackSetupOptions {
  key: string;
  email: string;
  amount: number;
  currency?: string;
  ref?: string;
  metadata?: Record<string, unknown>;
  callback: (response: { reference: string }) => void;
  onClose: () => void;
}

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue",
  "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu",
  "FCT (Abuja)", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina",
  "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo",
  "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
];

const PICKUP_ADDRESS =
  "Shop 26, Fesrach Plaza, Back of BRT, Ikotun, Lagos State, Nigeria";

type DeliveryMethod = "delivery" | "pickup";

interface CheckoutFormValues {
  fullName: string;
  phone: string;
  email: string;
  deliveryMethod: DeliveryMethod;
  address: string;
  state: string;
  city: string;
  landmark: string;
}

const initialValues: CheckoutFormValues = {
  fullName: "",
  phone: "",
  email: "",
  deliveryMethod: "delivery",
  address: "",
  state: "",
  city: "",
  landmark: "",
};

type FormErrors = Partial<Record<keyof CheckoutFormValues, string>>;

function formatNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

function validate(values: CheckoutFormValues): FormErrors {
  const errors: FormErrors = {};

  if (!values.fullName.trim()) errors.fullName = "Full name is required.";

  const digitsOnly = values.phone.replace(/[\s-]/g, "");
  if (!digitsOnly.trim()) {
    errors.phone = "Phone number is required.";
  } else if (!/^(0\d{10}|\+?234\d{10})$/.test(digitsOnly)) {
    errors.phone =
      "Enter a valid Nigerian phone number (e.g. 08012345678).";
  }

  if (!values.email.trim()) {
    errors.email = "Email address is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = "Enter a valid email address.";
  }

  if (values.deliveryMethod === "delivery") {
    if (!values.address.trim()) errors.address = "Delivery address is required.";
    if (!values.state.trim()) errors.state = "Please select a state.";
    if (!values.city.trim()) errors.city = "City is required.";
  }

  return errors;
}

export default function Checkout() {
  const { items, subtotal, clearCart } = useCart();
  const { showToast } = useToast();

  const [values, setValues] = useState<CheckoutFormValues>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const isPickup = values.deliveryMethod === "pickup";
  const deliveryFee = isPickup ? 0 : getDeliveryFee();
  const total = subtotal + deliveryFee;

  function handleChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  function setDeliveryMethod(method: DeliveryMethod) {
    setValues((prev) => ({ ...prev, deliveryMethod: method }));
    setErrors((prev) => ({
      ...prev,
      address: undefined,
      state: undefined,
      city: undefined,
    }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setCheckoutError(null);

    const validationErrors = validate(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    if (!window.PaystackPop) {
      setCheckoutError(
        "Payment system failed to load. Please refresh the page and try again."
      );
      return;
    }

    setSubmitting(true);

    // Create the order + order items via the create-order Edge Function.
    // This runs server-side with full database access, so guests never
    // need direct SELECT/INSERT access to the orders table themselves —
    // avoiding the RLS "insert-then-read-back" conflict a direct insert
    // ran into (INSERT was allowed for guests, but .select() after it
    // also requires SELECT, which only admins have).
    const { data: createResult, error: createError } = await supabase.functions.invoke(
      "create-order",
      {
        body: {
          fullName: values.fullName.trim(),
          phone: values.phone.trim(),
          email: values.email.trim(),
          deliveryMethod: values.deliveryMethod,
          address: isPickup ? null : values.address.trim(),
          state: isPickup ? null : values.state.trim(),
          city: isPickup ? null : values.city.trim(),
          landmark: isPickup ? null : values.landmark.trim() || null,
          expectedTotal: total,
          items: items.map((item) => ({
            productId: Number(item.product.id),
            quantity: item.quantity,
          })),
        },
      }
    );

    if (createError || !createResult?.success) {
      setSubmitting(false);
      setCheckoutError(
        createResult?.error ?? "Couldn't create your order. Please try again."
      );
      return;
    }

    const orderId: string = createResult.orderId;
    // Charge exactly what the server calculated and saved on the order.
    const amountToCharge: number = createResult.total;

    // Open Paystack's payment popup.
    const paystack = window.PaystackPop.setup({
      key: PAYSTACK_PUBLIC_KEY,
      email: values.email.trim(),
      amount: Math.round(amountToCharge * 100), // kobo
      currency: "NGN",
      metadata: { order_id: orderId },
      callback: (response) => {
        void verifyPayment(orderId, response.reference);
      },
      onClose: () => {
        // Customer closed the popup without paying — order stays "pending"
        // in the database; they can try again.
        setSubmitting(false);
      },
    });

    paystack.openIframe();
  }

  async function verifyPayment(orderId: string, reference: string) {
    const { data, error } = await supabase.functions.invoke(
      "verify-paystack-payment",
      { body: { orderId, reference } }
    );

    setSubmitting(false);

    if (error || !data?.success) {
      setCheckoutError(
        `We couldn't confirm your payment automatically. Please contact us with this reference: ${reference}`
      );
      return;
    }

    clearCart();
    setSubmitted(true);
    showToast("Payment successful — order placed!");
  }

  // Cart guard — no items, no checkout form.
  if (items.length === 0 && !submitted) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-24 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-muted">
          <ShoppingBag className="size-7 text-muted-foreground" />
        </span>
        <h1 className="mt-6 text-2xl font-bold tracking-tight">
          Your cart is empty
        </h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Add a few products to your cart before checking out.
        </p>
        <Button asChild size="lg" className="mt-6">
          <Link to="/shop">Browse Products</Link>
        </Button>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-24 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="size-7 text-emerald-600" />
        </span>
        <h1 className="mt-6 text-2xl font-bold tracking-tight">
          Order placed successfully
        </h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Thank you for your order! We'll be in touch with updates on your
          {values.deliveryMethod === "pickup" ? " pickup" : " delivery"}.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link to="/shop">Continue Shopping</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Link
        to="/cart"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Back to Cart
      </Link>

      <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
        Checkout
      </h1>

      <form onSubmit={handleSubmit} noValidate>
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="text-lg font-semibold">Customer Information</h2>

              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    value={values.fullName}
                    onChange={handleChange}
                    aria-invalid={Boolean(errors.fullName)}
                    className="mt-1.5"
                  />
                  {errors.fullName && (
                    <p className="mt-1.5 text-xs text-destructive">{errors.fullName}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="08012345678"
                    value={values.phone}
                    onChange={handleChange}
                    aria-invalid={Boolean(errors.phone)}
                    className="mt-1.5"
                  />
                  {errors.phone && (
                    <p className="mt-1.5 text-xs text-destructive">{errors.phone}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={values.email}
                    onChange={handleChange}
                    aria-invalid={Boolean(errors.email)}
                    className="mt-1.5"
                  />
                  {errors.email && (
                    <p className="mt-1.5 text-xs text-destructive">{errors.email}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-border bg-card p-6">
              <h2 className="text-lg font-semibold">Delivery Method</h2>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setDeliveryMethod("delivery")}
                  aria-pressed={!isPickup}
                  className={
                    !isPickup
                      ? "rounded-lg border-2 border-primary bg-primary/5 p-4 text-left"
                      : "rounded-lg border border-input p-4 text-left transition-colors hover:bg-accent"
                  }
                >
                  <span className="block text-sm font-semibold">Delivery</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    We deliver to your address in Lagos or other Nigerian
                    states.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setDeliveryMethod("pickup")}
                  aria-pressed={isPickup}
                  className={
                    isPickup
                      ? "rounded-lg border-2 border-primary bg-primary/5 p-4 text-left"
                      : "rounded-lg border border-input p-4 text-left transition-colors hover:bg-accent"
                  }
                >
                  <span className="block text-sm font-semibold">
                    Pickup In-Store
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    Collect your order yourself, no delivery fee.
                  </span>
                </button>
              </div>

              {isPickup ? (
                <div className="mt-4 flex items-start gap-3 rounded-lg border border-border bg-muted/50 p-4">
                  <MapPin className="mt-0.5 size-5 shrink-0 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Pickup Address</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {PICKUP_ADDRESS}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label htmlFor="address">Delivery Address</Label>
                    <Input
                      id="address"
                      name="address"
                      value={values.address}
                      onChange={handleChange}
                      aria-invalid={Boolean(errors.address)}
                      className="mt-1.5"
                    />
                    {errors.address && (
                      <p className="mt-1.5 text-xs text-destructive">{errors.address}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="state">State</Label>
                    <select
                      id="state"
                      name="state"
                      value={values.state}
                      onChange={handleChange}
                      aria-invalid={Boolean(errors.state)}
                      className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="">Select state</option>
                      {NIGERIAN_STATES.map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
                    {errors.state && (
                      <p className="mt-1.5 text-xs text-destructive">{errors.state}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      name="city"
                      value={values.city}
                      onChange={handleChange}
                      aria-invalid={Boolean(errors.city)}
                      className="mt-1.5"
                    />
                    {errors.city && (
                      <p className="mt-1.5 text-xs text-destructive">{errors.city}</p>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <Label htmlFor="landmark">Landmark (optional)</Label>
                    <Input
                      id="landmark"
                      name="landmark"
                      value={values.landmark}
                      onChange={handleChange}
                      className="mt-1.5"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 rounded-xl border border-border bg-card p-6">
              <h2 className="text-lg font-semibold">Payment Method</h2>
              <div className="mt-4 flex items-start gap-3 rounded-lg border border-border bg-muted/50 p-4">
                <CreditCard className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Pay securely with Paystack</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Card or bank transfer. You'll complete payment in a secure
                    popup after placing your order.
                  </p>
                </div>
              </div>
            </div>

            {checkoutError && (
              <div
                role="alert"
                className="mt-6 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              >
                {checkoutError}
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="text-lg font-semibold">Order Summary</h2>

              <ul className="mt-4 flex flex-col divide-y divide-border">
                {items.map((item) => (
                  <li key={item.product.id} className="flex gap-3 py-3">
                    <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                      <img
                        src={item.product.images[0] ?? "/placeholder-product.png"}
                        alt={item.product.name}
                        className="h-full w-full object-cover"
                        onError={(event) => {
                          event.currentTarget.src = "/placeholder-product.png";
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium leading-snug">
                        {item.product.name}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Qty {item.quantity} × {formatNaira(item.product.price)}
                      </p>
                    </div>
                    <span className="text-sm font-semibold">
                      {formatNaira(item.product.price * item.quantity)}
                    </span>
                  </li>
                ))}
              </ul>

              <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd>{formatNaira(subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Delivery Fee</dt>
                  <dd>
                    {isPickup
                      ? "Free (Pickup)"
                      : deliveryFee === 0
                        ? "Free (placeholder)"
                        : formatNaira(deliveryFee)}
                  </dd>
                </div>
                <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
                  <dt>Total</dt>
                  <dd>{formatNaira(total)}</dd>
                </div>
              </dl>

              <Button
                type="submit"
                size="lg"
                className="mt-6 w-full"
                disabled={submitting}
              >
                {submitting ? "Processing..." : "Place Order & Pay"}
              </Button>

              <p className="mt-3 text-center text-xs text-muted-foreground">
                You'll be asked to pay securely via Paystack.
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
