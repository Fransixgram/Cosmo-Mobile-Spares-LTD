// src/pages/AdminDashboard.tsx
//
// Dashboard shell only — no real statistics queries yet (that's a later
// phase). Every stat card intentionally shows a placeholder rather than
// any number, real or fabricated.

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
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";

const stats = [
  { label: "Total Products", icon: Package },
  { label: "Active Products", icon: PackageCheck },
  { label: "Categories", icon: Tags },
  { label: "Orders", icon: ClipboardList },
];

const quickActions = [
  { title: "Add Product", url: "/admin/products/new", icon: Plus },
  { title: "Manage Products", url: "/admin/products", icon: Settings2 },
  { title: "Manage Categories", url: "/admin/categories", icon: FolderCog },
  { title: "View Orders", url: "/admin/orders", icon: ListChecks },
];

export default function AdminDashboard() {
  return (
    <AdminLayout title="Dashboard">
      {/* Overview stats — placeholders only, no real or fabricated numbers */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(({ label, icon: Icon }) => (
          <div
            key={label}
            className="rounded-xl border border-border bg-card p-5"
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-primary/10">
              <Icon className="size-4 text-primary" />
            </span>
            <p className="mt-3 text-2xl font-bold tracking-tight text-muted-foreground">
              --
            </p>
            <p className="mt-1 text-sm font-medium">{label}</p>
            <p className="text-xs text-muted-foreground">Coming soon</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
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
