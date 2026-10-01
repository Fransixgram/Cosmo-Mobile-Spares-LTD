// src/pages/Checkout.tsx

import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  CreditCard,
  MapPin,
  PackageCheck,
  ShoppingBag,
  Truck,
} from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/contexts/ToastContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getDeliveryFee } from "@/lib/delivery";
import { supabase } from "@/lib/supabase";

// Safe to expose in frontend code — this is Paystack's PUBLIC key.
const PAYSTACK_PUBLIC_KEY =
  "pk_test_633918ab7d2c20858c10db9ec1eb054aa447b409";

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
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "FCT (Abuja)",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
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

  if (!values.fullName.trim()) {
    errors.fullName = "Full name is required.";
  }

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
    if (!values.address.trim()) {
      errors.address = "Delivery address is required.";
    }

    if (!values.state.trim()) {
      errors.state = "Please select a state.";
    }

    if (!values.city.trim()) {
      errors.city = "City is required.";
    }
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

    if (errors[name as keyof CheckoutFormValues]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
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

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    if (!window.PaystackPop) {
      setCheckoutError(
        "Payment system failed to load. Please refresh the page and try again."
      );
      return;
    }

    setSubmitting(true);

    const { data: createResult, error: createError } =
      await supabase.functions.invoke("create-order", {
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
      });

    if (createError || !createResult?.success) {
      setSubmitting(false);
      setCheckoutError(
        createResult?.error ?? "Couldn't create your order. Please try again."
      );
      return;
    }

    const orderId: string = createResult.orderId;
    const amountToCharge: number = createResult.total;

    const paystack = window.PaystackPop.setup({
      key: PAYSTACK_PUBLIC_KEY,
      email: values.email.trim(),
      amount: Math.round(amountToCharge * 100),
      currency: "NGN",
      metadata: { order_id: orderId },
      callback: (response) => {
        void verifyPayment(orderId, response.reference);
      },
      onClose: () => {
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

  if (items.length === 0 && !submitted) {
    return (
      <div className="min-h-[70vh] bg-background">
        <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-20 text-center sm:py-28">
          <span className="flex size-16 items-center justify-center rounded-2xl bg-brand-navy/10 text-brand-navy">
            <ShoppingBag className="size-7" />
          </span>

          <h1 className="mt-6 text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl">
            Your cart is empty
          </h1>

          <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
            Add a few products to your cart before checking out.
          </p>

          <Button asChild size="lg" className="mt-7">
            <Link to="/shop">
              Browse Products
              <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-[70vh] bg-background">
        <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-20 text-center sm:py-28">
          <span className="flex size-20 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="size-9 text-emerald-600" />
          </span>

          <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <Check className="size-3.5" />
            Payment confirmed
          </span>

          <h1 className="mt-4 text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl">
            Order placed successfully
          </h1>

          <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
            Thank you for your order! We'll be in touch with updates on your
            {values.deliveryMethod === "pickup" ? " pickup" : " delivery"}.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link to="/shop">
                Continue Shopping
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
        <Link
          to="/cart"
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-brand-navy"
        >
          <ChevronLeft className="size-4" />
          Back to Cart
        </Link>

        <div className="mt-6">
          <span
            className="inline-block h-1 w-10 rounded-full bg-brand-yellow"
            aria-hidden="true"
          />

          <h1 className="mt-3 text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl">
            Checkout
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Enter your details and choose how you'd like to receive your order.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
          <form
            onSubmit={handleSubmit}
            noValidate
            className="space-y-6 lg:col-span-2"
          >
            <section className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-navy/10 text-brand-navy">
                  <ShoppingBag className="size-5" />
                </span>

                <div>
                  <h2 className="text-lg font-semibold text-brand-navy">
                    Customer Information
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    We'll use these details to contact you about your order.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    value={values.fullName}
                    onChange={handleChange}
                    aria-invalid={Boolean(errors.fullName)}
                    placeholder="Enter your full name"
                    className="mt-1.5"
                  />
                  {errors.fullName && (
                    <p className="mt-1.5 text-xs text-destructive">
                      {errors.fullName}
                    </p>
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
                    <p className="mt-1.5 text-xs text-destructive">
                      {errors.phone}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    value={values.email}
                    onChange={handleChange}
                    aria-invalid={Boolean(errors.email)}
                    className="mt-1.5"
                  />
                  {errors.email && (
                    <p className="mt-1.5 text-xs text-destructive">
                      {errors.email}
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-red/10 text-brand-red">
                  <Truck className="size-5" />
                </span>

                <div>
                  <h2 className="text-lg font-semibold text-brand-navy">
                    Delivery Method
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Choose delivery or collect your order from our shop.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setDeliveryMethod("delivery")}
                  aria-pressed={!isPickup}
                  className={`group rounded-xl border p-4 text-left transition-all ${
                    !isPickup
                      ? "border-brand-red bg-brand-red/5 ring-1 ring-brand-red"
                      : "border-border bg-white hover:border-brand-navy/20 hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className={`flex size-10 items-center justify-center rounded-xl ${
                        !isPickup
                          ? "bg-brand-red text-white"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Truck className="size-5" />
                    </span>

                    <span
                      className={`flex size-5 items-center justify-center rounded-full border ${
                        !isPickup
                          ? "border-brand-red bg-brand-red text-white"
                          : "border-border"
                      }`}
                    >
                      {!isPickup && <Check className="size-3" />}
                    </span>
                  </div>

                  <span className="mt-4 block text-sm font-semibold text-foreground">
                    Delivery
                  </span>

                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                    We'll deliver to your address in Lagos or other Nigerian
                    states.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setDeliveryMethod("pickup")}
                  aria-pressed={isPickup}
                  className={`group rounded-xl border p-4 text-left transition-all ${
                    isPickup
                      ? "border-brand-red bg-brand-red/5 ring-1 ring-brand-red"
                      : "border-border bg-white hover:border-brand-navy/20 hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className={`flex size-10 items-center justify-center rounded-xl ${
                        isPickup
                          ? "bg-brand-red text-white"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <MapPin className="size-5" />
                    </span>

                    <span
                      className={`flex size-5 items-center justify-center rounded-full border ${
                        isPickup
                          ? "border-brand-red bg-brand-red text-white"
                          : "border-border"
                      }`}
                    >
                      {isPickup && <Check className="size-3" />}
                    </span>
                  </div>

                  <span className="mt-4 block text-sm font-semibold text-foreground">
                    Pickup In-Store
                  </span>

                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                    Collect your order yourself with no delivery fee.
                  </span>
                </button>
              </div>

              {isPickup ? (
                <div className="mt-4 rounded-xl border border-brand-navy/10 bg-brand-navy/5 p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-navy text-white">
                      <MapPin className="size-4" />
                    </span>

                    <div>
                      <p className="text-sm font-semibold text-brand-navy">
                        Pickup Address
                      </p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {PICKUP_ADDRESS}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label htmlFor="address">Delivery Address</Label>
                    <Input
                      id="address"
                      name="address"
                      value={values.address}
                      onChange={handleChange}
                      aria-invalid={Boolean(errors.address)}
                      placeholder="House number, street name..."
                      className="mt-1.5"
                    />
                    {errors.address && (
                      <p className="mt-1.5 text-xs text-destructive">
                        {errors.address}
                      </p>
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
                      className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-navy/20"
                    >
                      <option value="">Select state</option>
                      {NIGERIAN_STATES.map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
                    {errors.state && (
                      <p className="mt-1.5 text-xs text-destructive">
                        {errors.state}
                      </p>
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
                      placeholder="e.g. Lagos"
                      className="mt-1.5"
                    />
                    {errors.city && (
                      <p className="mt-1.5 text-xs text-destructive">
                        {errors.city}
                      </p>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <Label htmlFor="landmark">Landmark (optional)</Label>
                    <Input
                      id="landmark"
                      name="landmark"
                      value={values.landmark}
                      onChange={handleChange}
                      placeholder="Nearby landmark to help locate you"
                      className="mt-1.5"
                    />
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-yellow/20 text-brand-navy">
                  <CreditCard className="size-5" />
                </span>

                <div>
                  <h2 className="text-lg font-semibold text-brand-navy">
                    Payment Method
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Secure payment powered by Paystack.
                  </p>
                </div>
              </div>

              <div className="mt-5 flex items-start gap-3 rounded-xl border border-brand-navy/10 bg-brand-navy/5 p-4">
                <CreditCard className="mt-0.5 size-5 shrink-0 text-brand-navy" />

                <div>
                  <p className="text-sm font-semibold text-brand-navy">
                    Pay securely with Paystack
                  </p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Card or bank transfer. You'll complete payment in a secure
                    popup after placing your order.
                  </p>
                </div>
              </div>
            </section>

            {checkoutError && (
              <div
                role="alert"
                className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm leading-6 text-destructive"
              >
                {checkoutError}
              </div>
            )}

            <div className="rounded-xl border border-brand-navy/10 bg-brand-navy/5 p-4 text-sm text-muted-foreground">
              <div className="flex items-start gap-3">
                <PackageCheck className="mt-0.5 size-5 shrink-0 text-brand-navy" />
                <p className="leading-6">
                  Your order will only be confirmed after Paystack successfully
                  verifies your payment.
                </p>
              </div>
            </div>
          </form>

          <aside className="lg:col-span-1">
            <div className="sticky top-24 rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-brand-navy">
                  Order Summary
                </h2>

                <span className="rounded-full bg-brand-navy/10 px-2.5 py-1 text-xs font-semibold text-brand-navy">
                  {items.length} {items.length === 1 ? "item" : "items"}
                </span>
              </div>

              <ul className="mt-5 flex flex-col divide-y divide-border">
                {items.map((item) => (
                  <li key={item.product.id} className="flex gap-3 py-3 first:pt-0">
                    <div className="size-14 shrink-0 overflow-hidden rounded-xl bg-muted">
                      <img
                        src={
                          item.product.images[0] ??
                          "/placeholder-product.png"
                        }
                        alt={item.product.name}
                        className="h-full w-full object-cover"
                        onError={(event) => {
                          event.currentTarget.src =
                            "/placeholder-product.png";
                        }}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-medium leading-5">
                        {item.product.name}
                      </p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        Qty {item.quantity} ×{" "}
                        {formatNaira(item.product.price)}
                      </p>
                    </div>

                    <span className="shrink-0 text-sm font-semibold text-brand-navy">
                      {formatNaira(item.product.price * item.quantity)}
                    </span>
                  </li>
                ))}
              </ul>

              <dl className="mt-4 space-y-3 border-t border-border pt-4 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd className="font-medium">{formatNaira(subtotal)}</dd>
                </div>

                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Delivery Fee</dt>
                  <dd className="text-right font-medium">
                    {isPickup
                      ? "Free (Pickup)"
                      : deliveryFee === 0
                        ? "Free (placeholder)"
                        : formatNaira(deliveryFee)}
                  </dd>
                </div>

                <div className="flex items-end justify-between gap-4 border-t border-border pt-4">
                  <dt>
                    <span className="block text-base font-semibold text-brand-navy">
                      Total
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      Payable now
                    </span>
                  </dt>

                  <dd className="text-xl font-bold text-brand-red">
                    {formatNaira(total)}
                  </dd>
                </div>
              </dl>

              <Button
                type="submit"
                size="lg"
                className="mt-6 w-full"
                disabled={submitting}
                onClick={() => {
                  const form = document.querySelector("form");
                  form?.requestSubmit();
                }}
              >
                {submitting ? (
                  "Processing..."
                ) : (
                  <>
                    Place Order & Pay
                    <ArrowRight className="ml-2 size-4" />
                  </>
                )}
              </Button>

              <div className="mt-4 flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
                <CreditCard className="size-3.5" />
                <span>Secure payment via Paystack</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
