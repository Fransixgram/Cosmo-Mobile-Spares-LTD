// src/pages/AdminLogin.tsx
//
// Real admin login: Supabase Auth + admin_users verification via the
// useAdminAuth hook (src/lib/adminAuth.ts). Authentication foundation
// only — the dashboard itself isn't built yet (next phase).

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ShieldAlert } from "lucide-react";
import { useAdminAuth } from "@/lib/adminAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface FormErrors {
  email?: string;
  password?: string;
}

function validate(email: string, password: string): FormErrors {
  const errors: FormErrors = {};

  if (!email.trim()) {
    errors.email = "Email is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    errors.email = "Enter a valid email address.";
  }

  if (!password) {
    errors.password = "Password is required.";
  }

  return errors;
}

export default function AdminLogin() {
  const { isAdmin, checkingSession, signIn } = useAdminAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [authError, setAuthError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Already-authenticated admin (existing session restored on load) —
  // skip the login form entirely rather than forcing a fresh sign-in.
  // NOTE: the dashboard isn't built yet, so this points at the existing
  // /admin route (currently a placeholder), not /admin/dashboard — see
  // the note in the final report about that route naming.
  useEffect(() => {
    if (!checkingSession && isAdmin) {
      navigate("/admin", { replace: true });
    }
  }, [checkingSession, isAdmin, navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setAuthError(null);

    const errors = validate(email, password);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    const { error } = await signIn(email.trim(), password);
    setSubmitting(false);

    if (error) {
      setAuthError(error);
      return;
    }

    navigate("/admin", { replace: true });
  }

  // Checking for an existing session before deciding what to render.
  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Loader2 className="size-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <span className="text-lg font-bold tracking-tight">
            Cosmo<span className="text-primary"> Mobile Spares</span>
          </span>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">
            Admin Login
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Sign in to manage the store.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="mt-8 rounded-xl border border-border bg-card p-6"
        >
          {authError && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
            >
              <ShieldAlert className="mt-0.5 size-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <div className="flex flex-col gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? "email-error" : undefined}
                className="mt-1.5"
              />
              {fieldErrors.email && (
                <p id="email-error" className="mt-1.5 text-xs text-destructive">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={
                  fieldErrors.password ? "password-error" : undefined
                }
                className="mt-1.5"
              />
              {fieldErrors.password && (
                <p id="password-error" className="mt-1.5 text-xs text-destructive">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <Button type="submit" size="lg" className="mt-2 w-full" disabled={submitting}>
              {submitting ? "Signing In..." : "Sign In"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
