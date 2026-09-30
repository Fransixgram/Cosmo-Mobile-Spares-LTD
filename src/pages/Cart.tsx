import { Link } from "react-router-dom";
import {
  ArrowRight,
  Minus,
  Plus,
  ShoppingBag,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";

function formatNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function Cart() {
  const { items, removeItem, updateQuantity, itemCount, subtotal, isLoading } =
    useCart();

  if (isLoading) {
    return (
      <main className="min-h-[60vh] bg-background">
        <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-24 text-center">
          <span className="flex size-16 items-center justify-center rounded-2xl bg-brand-navy/10 text-brand-navy">
            <ShoppingCart className="size-7 animate-pulse" />
          </span>
          <p className="mt-6 text-sm text-muted-foreground">
            Loading your cart…
          </p>
        </div>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="min-h-[60vh] bg-background">
        <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-24 text-center">
          <span className="flex size-20 items-center justify-center rounded-3xl bg-brand-navy/10 text-brand-navy">
            <ShoppingBag className="size-8" />
          </span>

          <span className="mt-7 inline-block h-1 w-10 rounded-full bg-brand-yellow" />

          <h1 className="mt-4 text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl">
            Your cart is empty
          </h1>

          <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground sm:text-base">
            Browse our products and add the spare parts you need to your cart.
          </p>

          <Button asChild size="lg" className="mt-7 group">
            <Link to="/shop">
              Browse Products
              <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
        {/* Page heading */}
        <div className="mb-8">
          <span
            className="inline-block h-1 w-10 rounded-full bg-brand-yellow"
            aria-hidden="true"
          />
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl">
            Your Cart
          </h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Review your items before heading to checkout.
          </p>
        </div>

        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-3">
          {/* Cart items */}
          <section className="lg:col-span-2">
            <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-6">
                <div>
                  <h2 className="text-base font-semibold text-foreground">
                    Cart Items
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {itemCount} {itemCount === 1 ? "item" : "items"} in your
                    cart
                  </p>
                </div>

                <ShoppingCart className="size-5 text-brand-navy/60" />
              </div>

              <ul className="divide-y divide-border">
                {items.map((item) => {
                  const lineTotal = item.product.price * item.quantity;
                  const atMax = item.quantity >= item.product.stock;

                  return (
                    <li
                      key={item.product.id}
                      className="p-4 transition-colors hover:bg-muted/20 sm:p-5"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                        {/* Product image */}
                        <Link
                          to={`/product/${item.product.id}`}
                          className="group/image block size-24 shrink-0 overflow-hidden rounded-xl border border-border bg-muted sm:size-28"
                        >
                          <img
                            src={item.product.images[0]}
                            alt={item.product.name}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover/image:scale-105"
                          />
                        </Link>

                        {/* Product details */}
                        <div className="min-w-0 flex-1">
                          <span className="inline-flex rounded-full bg-brand-navy/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-brand-navy">
                            {item.product.category}
                          </span>

                          <Link
                            to={`/product/${item.product.id}`}
                            className="mt-2 block text-sm font-semibold leading-snug text-foreground transition-colors hover:text-brand-navy sm:text-base"
                          >
                            {item.product.name}
                          </Link>

                          <p className="mt-1 text-sm text-muted-foreground">
                            {formatNaira(item.product.price)} each
                          </p>

                          {atMax && (
                            <p className="mt-1 text-xs font-medium text-amber-600">
                              Maximum available stock selected
                            </p>
                          )}
                        </div>

                        {/* Controls + total */}
                        <div className="flex items-center justify-between gap-4 sm:justify-end">
                          <div className="flex items-center rounded-xl border border-border bg-muted/30 p-1">
                            <button
                              type="button"
                              onClick={() =>
                                updateQuantity(
                                  item.product.id,
                                  item.quantity - 1,
                                )
                              }
                              aria-label={`Decrease quantity of ${item.product.name}`}
                              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white hover:text-brand-navy"
                            >
                              <Minus className="size-3.5" />
                            </button>

                            <span className="w-9 text-center text-sm font-semibold">
                              {item.quantity}
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                updateQuantity(
                                  item.product.id,
                                  item.quantity + 1,
                                )
                              }
                              disabled={atMax}
                              aria-label={`Increase quantity of ${item.product.name}`}
                              title={
                                atMax ? "Maximum available stock" : undefined
                              }
                              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white hover:text-brand-navy disabled:pointer-events-none disabled:opacity-40"
                            >
                              <Plus className="size-3.5" />
                            </button>
                          </div>

                          <span className="min-w-24 text-right text-sm font-bold text-brand-navy">
                            {formatNaira(lineTotal)}
                          </span>

                          <button
                            type="button"
                            onClick={() => removeItem(item.product.id)}
                            aria-label={`Remove ${item.product.name} from cart`}
                            title="Remove item"
                            className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-red-50 hover:text-brand-red"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Continue shopping */}
            <div className="mt-5">
              <Link
                to="/shop"
                className="inline-flex items-center text-sm font-semibold text-brand-navy transition-colors hover:text-brand-red"
              >
                <ArrowRight className="mr-2 size-4 rotate-180" />
                Continue Shopping
              </Link>
            </div>
          </section>

          {/* Order summary */}
          <aside className="lg:col-span-1">
            <div className="sticky top-24 overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
              <div className="border-b border-border bg-brand-navy px-5 py-5 text-white sm:px-6">
                <span className="inline-block h-1 w-8 rounded-full bg-brand-yellow" />
                <h2 className="mt-3 text-lg font-bold">Order Summary</h2>
                <p className="mt-1 text-xs text-white/70">
                  {itemCount} {itemCount === 1 ? "item" : "items"} ready for
                  checkout
                </p>
              </div>

              <div className="p-5 sm:p-6">
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">
                      Items ({itemCount})
                    </dt>
                    <dd className="font-medium text-foreground">
                      {formatNaira(subtotal)}
                    </dd>
                  </div>

                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Delivery</dt>
                    <dd className="text-xs text-muted-foreground">
                      Calculated at checkout
                    </dd>
                  </div>

                  <div className="border-t border-border pt-4">
                    <div className="flex justify-between gap-4">
                      <dt className="font-semibold text-foreground">
                        Subtotal
                      </dt>
                      <dd className="text-lg font-bold text-brand-navy">
                        {formatNaira(subtotal)}
                      </dd>
                    </div>
                  </div>
                </dl>

                <Button asChild size="lg" className="mt-6 w-full group">
                  <Link to="/checkout">
                    Proceed to Checkout
                    <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>

                <p className="mt-4 text-center text-xs leading-5 text-muted-foreground">
                  Shipping and any applicable charges are calculated at
                  checkout.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
