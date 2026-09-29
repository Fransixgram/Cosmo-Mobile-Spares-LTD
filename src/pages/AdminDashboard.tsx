// src/pages/AdminDashboard.tsx
//
// Shop overview: counts, orders that still need attention, recent orders,
// and products that are out of stock or running low.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Package,
  PackageCheck,
  Tags,
  ClipboardList,
  Plus,
  Settings2,
  FolderCog,
  ListChecks,
  Loader2,
  AlertTriangle,
  Banknote,
  Truck,
  PackageX,
  PackageMinus,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";

const LOW_STOCK_MAX = 5;
const OPEN_ORDER_STATUSES = [
  "Pending",
  "Confirmed",
  "Processing",
  "Ready for Pickup",
  "Out for Delivery",
];

interface DashboardCounts {
  totalProducts: number;
  activeProducts: number;
  categories: number;
  orders: number;
  unpaidOrders: number;
  toFulfil: number;
  outOfStock: number;
  lowStock: number;
}

interface RecentOrder {
  id: string;
  created_at: string;
  full_name: string;
  total: number;
  payment_status: "pending" | "paid" | "failed";
  order_status: string;
}

interface StockAlert {
  id: number;
  name: string;
  stock: number;
  is_active: boolean;
}

const quickActions = [
  { title: "Add Product", url: "/admin/products/new", icon: Plus },
  { title: "Manage Products", url: "/admin/products", icon: Settings2 },
  { title: "Manage Categories", url: "/admin/categories", icon: FolderCog },
  { title: "View Orders", url: "/admin/orders", icon: ListChecks },
];

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
    hour: "numeric",
    minute: "2-digit",
  });
}

function paymentBadgeClass(status: RecentOrder["payment_status"]) {
  if (status === "paid") {
    return "inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700";
  }
  if (status === "failed") {
    return "inline-flex items-center rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive";
  }
  return "inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700";
}

export default function AdminDashboard() {
  const [counts, setCounts] = useState<DashboardCounts | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setError(null);

      const [
        totalProducts,
        activeProducts,
        categories,
        orders,
        unpaidOrders,
        toFulfil,
        outOfStock,
        lowStock,
        recentOrdersResult,
        stockAlertsResult,
      ] = await Promise.all([
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("products").select("*", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("categories").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("*", { count: "exact", head: true }),
        supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .eq("payment_status", "pending"),
        supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .eq("payment_status", "paid")
          .in("order_status", OPEN_ORDER_STATUSES),
        supabase.from("products").select("*", { count: "exact", head: true }).eq("stock", 0),
        supabase
          .from("products")
          .select("*", { count: "exact", head: true })
          .gt("stock", 0)
          .lte("stock", LOW_STOCK_MAX),
        supabase
          .from("orders")
          .select("id, created_at, full_name, total, payment_status, order_status")
          .order("created_at", { ascending: false })
          .limit(8),
        supabase
          .from("products")
          .select("id, name, stock, is_active")
          .lte("stock", LOW_STOCK_MAX)
          .order("stock", { ascending: true })
          .limit(10),
      ]);

      if (cancelled) return;

      const failed =
        totalProducts.error ||
        activeProducts.error ||
        categories.error ||
        orders.error ||
        unpaidOrders.error ||
        toFulfil.error ||
        outOfStock.error ||
        lowStock.error ||
        recentOrdersResult.error ||
        stockAlertsResult.error;

      if (failed) {
        setError("Couldn't load dashboard numbers right now. Please try again shortly.");
        setCounts(null);
        setRecentOrders([]);
        setStockAlerts([]);
        setLoading(false);
        return;
      }

      setCounts({
        totalProducts: totalProducts.count ?? 0,
        activeProducts: activeProducts.count ?? 0,
        categories: categories.count ?? 0,
        orders: orders.count ?? 0,
        unpaidOrders: unpaidOrders.count ?? 0,
        toFulfil: toFulfil.count ?? 0,
        outOfStock: outOfStock.count ?? 0,
        lowStock: lowStock.count ?? 0,
      });
      setRecentOrders(recentOrdersResult.data ?? []);
      setStockAlerts(stockAlertsResult.data ?? []);
      setLoading(false);
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  const overviewCards = [
    {
      label: "Total Products",
      icon: Package,
      value: counts?.totalProducts,
      href: "/admin/products",
    },
    {
      label: "Active Products",
      icon: PackageCheck,
      value: counts?.activeProducts,
      href: "/admin/products",
    },
    {
      label: "Categories",
      icon: Tags,
      value: counts?.categories,
      href: "/admin/categories",
    },
    {
      label: "Orders",
      icon: ClipboardList,
      value: counts?.orders,
      href: "/admin/orders",
    },
  ];

  const attentionCards = [
    {
      label: "Unpaid orders",
      hint: "Checkout started, payment not confirmed",
      icon: Banknote,
      value: counts?.unpaidOrders,
      href: "/admin/orders",
    },
    {
      label: "To fulfil",
      hint: "Paid, not delivered or cancelled",
      icon: Truck,
      value: counts?.toFulfil,
      href: "/admin/orders",
    },
    {
      label: "Out of stock",
      hint: "Stock is 0",
      icon: PackageX,
      value: counts?.outOfStock,
      href: "/admin/products",
    },
    {
      label: "Low stock",
      hint: `1–${LOW_STOCK_MAX} left`,
      icon: PackageMinus,
      value: counts?.lowStock,
      href: "/admin/products",
    },
  ];

  return (
    <AdminLayout title="Dashboard">
      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {overviewCards.map(({ label, icon: Icon, value, href }) => (
          <Link
            key={label}
            to={href}
            className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-primary/10">
              <Icon className="size-4 text-primary" />
            </span>
            <p className="mt-3 text-2xl font-bold tracking-tight">
              {loading ? (
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              ) : (
                value ?? "--"
              )}
            </p>
            <p className="mt-1 text-sm font-medium">{label}</p>
          </Link>
        ))}
      </div>

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Needs attention
      </h2>
      <div className="mt-3 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {attentionCards.map(({ label, hint, icon: Icon, value, href }) => (
          <Link
            key={label}
            to={href}
            className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-primary/10">
              <Icon className="size-4 text-primary" />
            </span>
            <p className="mt-3 text-2xl font-bold tracking-tight">
              {loading ? (
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              ) : (
                value ?? "--"
              )}
            </p>
            <p className="mt-1 text-sm font-medium">{label}</p>
            <p className="text-xs text-muted-foreground">{hint}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <h2 className="text-sm font-semibold">Recent orders</h2>
            <Link to="/admin/orders" className="text-xs font-medium text-primary hover:underline">
              View all
            </Link>
          </div>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : recentOrders.length === 0 ? (
            <p className="px-5 py-8 text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {recentOrders.map((order) => (
                <li key={order.id}>
                  <Link
                    to="/admin/orders"
                    className="flex flex-col gap-1 px-5 py-3 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium">{order.full_name}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(order.created_at)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      <span className="text-sm font-medium">{formatNaira(Number(order.total))}</span>
                      <span className={paymentBadgeClass(order.payment_status)}>
                        {order.payment_status}
                      </span>
                      <span className="text-xs text-muted-foreground">{order.order_status}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <h2 className="text-sm font-semibold">Stock alerts</h2>
            <Link to="/admin/products" className="text-xs font-medium text-primary hover:underline">
              Manage products
            </Link>
          </div>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : stockAlerts.length === 0 ? (
            <p className="px-5 py-8 text-sm text-muted-foreground">
              Nothing is at {LOW_STOCK_MAX} or below. Good.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {stockAlerts.map((product) => (
                <li key={product.id}>
                  <Link
                    to={`/admin/products/${product.id}/edit`}
                    className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-muted/40"
                  >
                    <div>
                      <p className="text-sm font-medium">{product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {product.is_active ? "Visible in shop" : "Hidden from shop"}
                      </p>
                    </div>
                    <span
                      className={
                        product.stock === 0
                          ? "text-sm font-semibold text-destructive"
                          : "text-sm font-semibold text-amber-600"
                      }
                    >
                      {product.stock === 0 ? "Out of stock" : `${product.stock} left`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Quick Actions
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map(({ title, url, icon: Icon }) => (
            <Button
              key={url}
              asChild
              variant="outline"
              className="h-auto justify-start gap-2.5 py-3"
            >
              <Link to={url}>
                <Icon className="size-4 shrink-0" />
                {title}
              </Link>
            </Button>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
