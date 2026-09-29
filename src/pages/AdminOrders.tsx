// src/pages/AdminOrders.tsx
//
// Admin order management: lists recent orders with their items, lets the
// admin update an order's fulfilment status. Payment status is read-only
// here — it's only ever set by verify-paystack-payment, never by hand,
// so a paid order can't accidentally be un-marked as paid from this page.

import { useEffect, useState } from "react";
import { Loader2, AlertTriangle, PackageX, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/contexts/ToastContext";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";

const ORDER_STATUSES = [
  "Pending",
  "Confirmed",
  "Processing",
  "Ready for Pickup",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
] as const;

interface OrderItemRow {
  id: string;
  order_id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  line_total: number;
}

interface OrderRow {
  id: string;
  created_at: string;
  full_name: string;
  phone: string;
  email: string;
  delivery_method: "delivery" | "pickup";
  address: string | null;
  state: string | null;
  city: string | null;
  landmark: string | null;
  subtotal: number;
  delivery_fee: number;
  total: number;
  payment_status: "pending" | "paid" | "failed";
  order_status: (typeof ORDER_STATUSES)[number];
}

function formatNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function paymentBadgeClass(status: OrderRow["payment_status"]) {
  if (status === "paid") {
    return "inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700";
  }
  if (status === "failed") {
    return "inline-flex items-center rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive";
  }
  return "inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700";
}

export default function AdminOrders() {
  const { showToast } = useToast();

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [itemsByOrderId, setItemsByOrderId] = useState<Map<string, OrderItemRow[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadOrders() {
      setLoading(true);
      setError(null);

      const { data: orderRows, error: ordersError } = await supabase
        .from("orders")
        .select(
          "id, created_at, full_name, phone, email, delivery_method, address, state, city, landmark, subtotal, delivery_fee, total, payment_status, order_status"
        )
        .order("created_at", { ascending: false })
        .limit(100);

      if (cancelled) return;

      if (ordersError || !orderRows) {
        setError("Couldn't load orders right now. Please try again shortly.");
        setOrders([]);
        setLoading(false);
        return;
      }

      const orderIds = orderRows.map((order) => order.id);
      const grouped = new Map<string, OrderItemRow[]>();

      if (orderIds.length > 0) {
        const { data: itemRows } = await supabase
          .from("order_items")
          .select("id, order_id, product_name, unit_price, quantity, line_total")
          .in("order_id", orderIds);

        for (const item of itemRows ?? []) {
          const existing = grouped.get(item.order_id) ?? [];
          existing.push(item);
          grouped.set(item.order_id, existing);
        }
      }

      if (!cancelled) {
        setOrders(orderRows);
        setItemsByOrderId(grouped);
        setLoading(false);
      }
    }

    loadOrders();

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  async function handleStatusChange(orderId: string, newStatus: string) {
    setUpdatingId(orderId);

    const { error: updateError } = await supabase
      .from("orders")
      .update({ order_status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", orderId);

    setUpdatingId(null);

    if (updateError) {
      showToast("Couldn't update order status. Please try again.");
      return;
    }

    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId
          ? { ...order, order_status: newStatus as OrderRow["order_status"] }
          : order
      )
    );
    showToast("Order status updated");
  }

  return (
    <AdminLayout title="Orders">
      <p className="text-sm text-muted-foreground">
        Recent customer orders — most recent first.
      </p>

      {loading ? (
        <div className="mt-16 flex flex-col items-center text-center">
          <Loader2 className="size-7 animate-spin text-muted-foreground" />
          <p className="mt-4 text-sm text-muted-foreground">Loading orders…</p>
        </div>
      ) : error ? (
        <div className="mt-16 flex flex-col items-center text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="size-7 text-destructive" />
          </span>
          <h2 className="mt-6 text-lg font-semibold">Couldn't load orders</h2>
          <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{error}</p>
          <Button
            variant="outline"
            className="mt-5"
            onClick={() => setReloadToken((token) => token + 1)}
          >
            Try Again
          </Button>
        </div>
      ) : orders.length === 0 ? (
        <div className="mt-16 flex flex-col items-center text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-muted">
            <PackageX className="size-7 text-muted-foreground" />
          </span>
          <h2 className="mt-6 text-lg font-semibold">No orders yet</h2>
          <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
            Orders placed by customers will show up here.
          </p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Payment</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Placed</th>
                <th className="px-4 py-3 text-right font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.map((order) => {
                const isExpanded = expandedId === order.id;
                const items = itemsByOrderId.get(order.id) ?? [];

                return (
                  <>
                    <tr key={order.id}>
                      <td className="px-4 py-3">
                        <div className="font-medium">{order.full_name}</div>
                        <div className="text-xs text-muted-foreground">{order.phone}</div>
                      </td>
                      <td className="px-4 py-3 capitalize text-muted-foreground">
                        {order.delivery_method}
                      </td>
                      <td className="px-4 py-3 font-medium">{formatNaira(order.total)}</td>
                      <td className="px-4 py-3">
                        <span className={paymentBadgeClass(order.payment_status)}>
                          {order.payment_status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={order.order_status}
                          disabled={updatingId === order.id}
                          onChange={(event) => handleStatusChange(order.id, event.target.value)}
                          className="h-8 rounded-md border border-input bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                        >
                          {ORDER_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {formatDate(order.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() => setExpandedId(isExpanded ? null : order.id)}
                        >
                          {isExpanded ? (
                            <>
                              Hide <ChevronUp className="size-3.5" />
                            </>
                          ) : (
                            <>
                              View <ChevronDown className="size-3.5" />
                            </>
                          )}
                        </Button>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr key={`${order.id}-details`}>
                        <td colSpan={7} className="bg-muted/30 px-4 py-4">
                          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                            <div>
                              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Items
                              </h3>
                              <ul className="mt-2 flex flex-col gap-1.5">
                                {items.map((item) => (
                                  <li key={item.id} className="flex justify-between text-sm">
                                    <span>
                                      {item.product_name} × {item.quantity}
                                    </span>
                                    <span className="font-medium">
                                      {formatNaira(item.line_total)}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                              <dl className="mt-3 space-y-1 border-t border-border pt-2 text-sm">
                                <div className="flex justify-between text-muted-foreground">
                                  <dt>Subtotal</dt>
                                  <dd>{formatNaira(order.subtotal)}</dd>
                                </div>
                                <div className="flex justify-between text-muted-foreground">
                                  <dt>Delivery Fee</dt>
                                  <dd>{formatNaira(order.delivery_fee)}</dd>
                                </div>
                              </dl>
                            </div>

                            <div>
                              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                {order.delivery_method === "pickup"
                                  ? "Pickup"
                                  : "Delivery Address"}
                              </h3>
                              <p className="mt-2 text-sm text-muted-foreground">
                                Email: {order.email}
                              </p>
                              {order.delivery_method === "delivery" ? (
                                <p className="mt-1 text-sm text-muted-foreground">
                                  {order.address}, {order.city}, {order.state}
                                  {order.landmark ? ` (near ${order.landmark})` : ""}
                                </p>
                              ) : (
                                <p className="mt-1 text-sm text-muted-foreground">
                                  Customer will collect in-store.
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
