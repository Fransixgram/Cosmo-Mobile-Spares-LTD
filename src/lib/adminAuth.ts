// src/lib/adminAuth.ts
//
// Reusable admin authentication/authorization hook. A plain hook rather
// than a Context/Provider on purpose — only AdminLogin uses it right now,
// and this avoids touching App.tsx for this phase. Any future admin page
// (dashboard, products, orders) can call useAdminAuth() the same way; if
// several admin pages end up needing shared state later, this is the
// natural thing to lift into a Provider then, but that's not necessary
// yet.
//
// NOTE ON SCHEMA ASSUMPTION: this checks admin status via
// `public.admin_users` matched on a `user_id` column referencing
// `auth.users.id`. If your table instead uses `id` as the auth user id
// (some projects do it that way, like a `profiles` table), change the
// `.eq("user_id", userId)` line in checkIsAdmin() below to `.eq("id", userId)`.

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

async function checkIsAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("admin_users")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  return !error && Boolean(data);
}

export function useAdminAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // On mount: restore any existing Supabase session (supabase-js persists
  // it in localStorage by default) and re-verify admin status against it,
  // rather than forcing a fresh login on every page refresh.
  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;

      const currentSession = data.session;
      if (currentSession) {
        const admin = await checkIsAdmin(currentSession.user.id);
        if (cancelled) return;

        setSession(currentSession);
        setIsAdmin(admin);
      }

      setCheckingSession(false);
    }

    restoreSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        if (!newSession) setIsAdmin(false);
      }
    );

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function signIn(
    email: string,
    password: string
  ): Promise<{ error: string | null }> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: error.message };
    }

    if (!data.session) {
      return { error: "Sign in failed. Please try again." };
    }

    const admin = await checkIsAdmin(data.session.user.id);

    if (!admin) {
      // Authenticated successfully, but not an admin — sign them out
      // immediately rather than leaving a non-admin session active.
      await supabase.auth.signOut();
      setSession(null);
      setIsAdmin(false);
      return { error: "You are not authorized to access the admin area." };
    }

    setSession(data.session);
    setIsAdmin(true);
    return { error: null };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setIsAdmin(false);
  }

  return { session, isAdmin, checkingSession, signIn, signOut };
}
