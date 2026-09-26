// src/pages/Cart.tsx

import { Link } from "react-router-dom";
import { Minus, Plus, Trash2, ShoppingCart } from "lucide-react";
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
      <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-24 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-muted">
          <ShoppingCart className="size-7 animate-pulse text-muted-foreground" />
        </span>
        <p className="mt-6 text-sm text-muted-foreground">
          Loading your cart…
        </p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-24 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-muted">
          <ShoppingCart className="size-7 text-muted-foreground" />
        </span>
        <h1 className="mt-6 text-2xl font-bold tracking-tight">
          Your cart is empty
        </h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Browse our products and add the spare parts you need.
        </p>
        <Button asChild size="lg" className="mt-6">
          <Link to="/shop">Browse Products</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
        Your Cart
      </h1>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Cart items */}
        <div className="lg:col-span-2">
          <ul className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card">
            {items.map((item) => {
              const lineTotal = item.product.price * item.quantity;
              const atMax = item.quantity >= item.product.stock;

              return (
                <li
                  key={item.product.id}
                  className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center"
                >
                  <Link
                    to={`/product/${item.product.id}`}
                    className="block size-20 shrink-0 overflow-hidden rounded-lg bg-muted"
                  >
                    <img
                      src={item.product.images[0]}
                      alt={item.product.name}
                      className="h-full w-full object-cover"
                    />
                  </Link>

                  <div className="flex-1">
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {item.product.category}
                    </span>
                    <Link
                      to={`/product/${item.product.id}`}
                      className="block text-sm font-semibold hover:underline"
                    >
                      {item.product.name}
                    </Link>
                    <span className="mt-1 block text-sm text-muted-foreground">
                      {formatNaira(item.product.price)} each
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    {/* Quantity controls */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.product.id, item.quantity - 1)
                        }
                        aria-label={`Decrease quantity of ${item.product.name}`}
                        className="flex size-8 items-center justify-center rounded-full border border-input transition-colors hover:bg-accent"
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <span className="w-6 text-center text-sm font-medium">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.product.id, item.quantity + 1)
                        }
                        disabled={atMax}
                        aria-label={`Increase quantity of ${item.product.name}`}
                        title={atMax ? "Maximum available stock" : undefined}
                        className="flex size-8 items-center justify-center rounded-full border border-input transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-40"
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>

                    <span className="w-24 text-right text-sm font-semibold">
                      {formatNaira(lineTotal)}
                    </span>

                    <button
                      type="button"
                      onClick={() => removeItem(item.product.id)}
                      aria-label={`Remove ${item.product.name} from cart`}
                      className="text-muted-foreground transition-colors hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Order summary */}
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold">Order Summary</h2>

            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">
                  Items ({itemCount})
                </dt>
                <dd>{formatNaira(subtotal)}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
                <dt>Subtotal</dt>
                <dd>{formatNaira(subtotal)}</dd>
              </div>
            </dl>

            <Button asChild size="lg" className="mt-6 w-full">
              <Link to="/checkout">Proceed to Checkout</Link>
            </Button>

            <p className="mt-3 text-center text-xs text-muted-foreground">
              Shipping and any applicable charges are calculated at checkout.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
