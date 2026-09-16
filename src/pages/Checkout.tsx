// src/pages/Checkout.tsx
//
// Checkout UI only — no backend, no Supabase, no Paystack. Submitting the
// form builds a mock order payload (logged to the console for dev
// purposes) and shows a success state. The cart is deliberately NOT
// cleared here; that happens once a real order/payment flow exists.

import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ShoppingBag, CreditCard, CheckCircle2 } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/contexts/ToastContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getDeliveryFee } from "@/lib/delivery";

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue",
  "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu",
  "FCT (Abuja)", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina",
  "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo",
  "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
];

interface CheckoutFormValues {
  fullName: string;
  phone: string;
  email: string;
  address: string;
  state: string;
  city: string;
  landmark: string;
}

const initialValues: CheckoutFormValues = {
  fullName: "",
  phone: "",
  email: "",
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

  if (!values.address.trim()) errors.address = "Delivery address is required.";
  if (!values.state.trim()) errors.state = "Please select a state.";
  if (!values.city.trim()) errors.city = "City is required.";

  return errors;
}

export default function Checkout() {
  const { items, subtotal } = useCart();
  const { showToast } = useToast();

  const [values, setValues] = useState<CheckoutFormValues>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const deliveryFee = getDeliveryFee();
  const total = subtotal + deliveryFee;

  function handleChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const validationErrors = validate(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSubmitting(true);

    // Temporary mock order payload — development/testing only.
    // Not sent anywhere: no backend call, no Supabase record, no Paystack.
    const mockOrderPayload = {
      customer: { ...values },
      items: items.map((item) => ({
        productId: item.product.id,
        name: item.product.name,
        unitPrice: item.product.price,
        quantity: item.quantity,
        lineTotal: item.product.price * item.quantity,
      })),
      subtotal,
      deliveryFee,
      total,
      submittedAt: new Date().toISOString(),
    };

    // eslint-disable-next-line no-console
    console.log("[Cosmo Mobile Spares Ltd] Mock order payload:", mockOrderPayload);

    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
      showToast("Order submitted (test mode)");
    }, 400);
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

  // Mock success state.
  if (submitted) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-24 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="size-7 text-emerald-600" />
        </span>
        <h1 className="mt-6 text-2xl font-bold tracking-tight">
          Order submitted (test mode)
        </h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          This is a development preview — no real order was placed and no
          payment was processed. Real checkout will be connected in a later
          phase.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button asChild variant="outline" size="lg">
            <Link to="/cart">Back to Cart</Link>
          </Button>
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
          {/* Customer information */}
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
                    aria-describedby={errors.fullName ? "fullName-error" : undefined}
                    className="mt-1.5"
                  />
                  {errors.fullName && (
                    <p id="fullName-error" className="mt-1.5 text-xs text-destructive">
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
                    aria-describedby={errors.phone ? "phone-error" : undefined}
                    className="mt-1.5"
                  />
                  {errors.phone && (
                    <p id="phone-error" className="mt-1.5 text-xs text-destructive">
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
                    value={values.email}
                    onChange={handleChange}
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? "email-error" : undefined}
                    className="mt-1.5"
                  />
                  {errors.email && (
                    <p id="email-error" className="mt-1.5 text-xs text-destructive">
                      {errors.email}
                    </p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <Label htmlFor="address">Delivery Address</Label>
                  <Input
                    id="address"
                    name="address"
                    value={values.address}
                    onChange={handleChange}
                    aria-invalid={Boolean(errors.address)}
                    aria-describedby={errors.address ? "address-error" : undefined}
                    className="mt-1.5"
                  />
                  {errors.address && (
                    <p id="address-error" className="mt-1.5 text-xs text-destructive">
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
                    aria-describedby={errors.state ? "state-error" : undefined}
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
                    <p id="state-error" className="mt-1.5 text-xs text-destructive">
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
                    aria-describedby={errors.city ? "city-error" : undefined}
                    className="mt-1.5"
                  />
                  {errors.city && (
                    <p id="city-error" className="mt-1.5 text-xs text-destructive">
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
                    className="mt-1.5"
                  />
                </div>
              </div>
            </div>

            {/* Payment method — UI only, not wired up yet */}
            <div className="mt-6 rounded-xl border border-border bg-card p-6">
              <h2 className="text-lg font-semibold">Payment Method</h2>
              <div className="mt-4 flex items-start gap-3 rounded-lg border border-dashed border-border bg-muted/50 p-4">
                <CreditCard className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    Online payment — coming soon
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Payment processing isn't connected yet. Placing an order
                    right now only submits a test order for development
                    purposes — no payment will be requested or charged.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Order summary */}
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
                    {deliveryFee === 0
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
                {submitting ? "Placing Order..." : "Place Order"}
              </Button>

              <p className="mt-3 text-center text-xs text-muted-foreground">
                Test mode — no payment will be requested.
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
