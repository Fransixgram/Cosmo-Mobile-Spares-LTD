// src/pages/AdminSettings.tsx
//
// Admin account settings: change password (takes effect immediately) and
// change email (Supabase sends a confirmation link to the new address;
// the change only applies once that link is clicked — this is expected
// Supabase behavior, not a bug).

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAdminAuth } from "@/lib/adminAuth";
import { useToast } from "@/contexts/ToastContext";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminSettings() {
  const { session } = useAdminAuth();
  const { showToast } = useToast();

  // Password form
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  // Email form
  const [newEmail, setNewEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailNotice, setEmailNotice] = useState<string | null>(null);
  const [savingEmail, setSavingEmail] = useState(false);

  async function handlePasswordSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPasswordError(null);

    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords don't match.");
      return;
    }

    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);

    if (error) {
      setPasswordError(error.message);
      return;
    }

    setNewPassword("");
    setConfirmPassword("");
    showToast("Password updated");
  }

  async function handleEmailSubmit(event: React.FormEvent) {
    event.preventDefault();
    setEmailError(null);
    setEmailNotice(null);

    const trimmed = newEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError("Enter a valid email address.");
      return;
    }

    setSavingEmail(true);
    const { error } = await supabase.auth.updateUser({ email: trimmed });
    setSavingEmail(false);

    if (error) {
      setEmailError(error.message);
      return;
    }

    setNewEmail("");
    setEmailNotice(
      `A confirmation link was sent to ${trimmed}. The email won't change until you click it.`
    );
  }

  return (
    <AdminLayout title="Settings">
      <div className="max-w-md space-y-6">
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Change Password
          </h2>

          <form onSubmit={handlePasswordSubmit} className="mt-4 flex flex-col gap-4">
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="mt-1.5"
              />
            </div>

            {passwordError && (
              <p className="text-xs text-destructive">{passwordError}</p>
            )}

            <Button type="submit" disabled={savingPassword} className="gap-1.5 self-start">
              {savingPassword && <Loader2 className="size-4 animate-spin" />}
              {savingPassword ? "Saving..." : "Update Password"}
            </Button>
          </form>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Change Email
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Current email: {session?.user.email ?? "—"}
          </p>

          <form onSubmit={handleEmailSubmit} className="mt-4 flex flex-col gap-4">
            <div>
              <Label htmlFor="newEmail">New Email</Label>
              <Input
                id="newEmail"
                type="email"
                value={newEmail}
                onChange={(event) => setNewEmail(event.target.value)}
                className="mt-1.5"
              />
            </div>

            {emailError && <p className="text-xs text-destructive">{emailError}</p>}
            {emailNotice && (
              <p className="text-xs text-muted-foreground">{emailNotice}</p>
            )}

            <Button type="submit" disabled={savingEmail} className="gap-1.5 self-start">
              {savingEmail && <Loader2 className="size-4 animate-spin" />}
              {savingEmail ? "Saving..." : "Update Email"}
            </Button>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}
