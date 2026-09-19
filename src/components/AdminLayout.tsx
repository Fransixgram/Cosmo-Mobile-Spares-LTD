// src/components/AdminLayout.tsx
//
// Shared shell for admin pages: sidebar nav on desktop, a Sheet-based
// mobile menu (reusing the existing Sheet component — no new UI library),
// and a top bar with the page title, logged-in admin's email, and logout.
//
// Only AdminDashboard uses this for now, per this phase's scope. Other
// admin pages can adopt it later without any changes needed here.

import { useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Tags,
  ClipboardList,
  Settings,
  Menu,
  LogOut,
} from "lucide-react";
import { useAdminAuth } from "@/lib/adminAuth";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const navItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Products", url: "/admin/products", icon: Package },
  { title: "Categories", url: "/admin/categories", icon: Tags },
  { title: "Orders", url: "/admin/orders", icon: ClipboardList },
  { title: "Settings", url: "/admin/settings", icon: Settings },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname } = useLocation();

  return (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => {
        const isActive = pathname === item.url;
        const Icon = item.icon;

        return (
          <Link
            key={item.url}
            to={item.url}
            onClick={onNavigate}
            className={
              isActive
                ? "flex items-center gap-3 rounded-lg bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground"
                : "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
            }
          >
            <Icon className="size-4 shrink-0" />
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}

interface AdminLayoutProps {
  title: string;
  children: ReactNode;
}

export default function AdminLayout({ title, children }: AdminLayoutProps) {
  const { session, signOut } = useAdminAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    await signOut();
    navigate("/admin/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-7xl">
        {/* Desktop sidebar */}
        <aside className="hidden w-64 shrink-0 border-r border-border p-4 lg:block">
          <Link to="/admin" className="block px-2 py-2">
            <span className="text-lg font-bold tracking-tight">
              Cosmo<span className="text-primary"> Mobile Spares</span>
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Admin
            </span>
          </Link>

          <div className="mt-6">
            <NavLinks />
          </div>
        </aside>

        {/* Main column */}
        <div className="min-w-0 flex-1">
          {/* Top bar */}
          <header className="flex items-center justify-between gap-4 border-b border-border px-4 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              {/* Mobile menu trigger */}
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden"
                    aria-label="Open admin menu"
                  >
                    <Menu className="size-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72">
                  <SheetHeader>
                    <SheetTitle>
                      <span className="text-base font-bold tracking-tight">
                        Cosmo<span className="text-primary"> Mobile Spares</span>
                      </span>
                      <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                        Admin
                      </span>
                    </SheetTitle>
                  </SheetHeader>
                  <div className="mt-6">
                    <NavLinks onNavigate={() => setMobileOpen(false)} />
                  </div>
                </SheetContent>
              </Sheet>

              <h1 className="text-lg font-semibold sm:text-xl">{title}</h1>
            </div>

            <div className="flex items-center gap-3">
              {session?.user.email && (
                <span className="hidden max-w-[14rem] truncate text-sm text-muted-foreground sm:inline">
                  {session.user.email}
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="gap-1.5"
              >
                <LogOut className="size-3.5" />
                Logout
              </Button>
            </div>
          </header>

          {/* Page content */}
          <main className="px-4 py-6 sm:px-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
