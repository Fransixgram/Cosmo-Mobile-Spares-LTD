// src/components/RequireAdmin.tsx
//
// Wraps a route element to enforce admin-only access. Reuses the same
// useAdminAuth() hook AdminLogin.tsx uses — no second admin-check system.
// isAdmin is only ever true once BOTH a session exists AND that user was
// found in public.admin_users, so this one check correctly covers both
// "not signed in" and "signed in but not an admin" in a single condition.

import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAdminAuth } from "@/lib/adminAuth";

export default function RequireAdmin({ children }: { children: ReactNode }) {
  const { isAdmin, checkingSession } = useAdminAuth();

  // Don't decide anything — and don't render the protected page — until
  // the existing session/admin check has actually finished. This is what
  // avoids the flash of admin content before a redirect.
  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
}
