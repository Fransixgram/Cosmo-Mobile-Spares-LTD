// supabase/functions/paystack-webhook/index.ts
//
// Receives payment confirmations directly from Paystack's servers, as a
// safety net for cases where the customer's browser closes/crashes
// before the frontend's own verify-paystack-payment call completes.
// Every request is verified with an HMAC-SHA512 signature before anything
// is trusted — this endpoint is public, so without that check anyone
// could fake a "payment succeeded" call.
//
// Deployed with --no-verify-jwt, since Paystack's server-to-server call
// carries no Supabase auth token. Security instead comes entirely from
// the signature check below.

import { createClient } from "npm:@supabase/supabase-js@2";

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function isValidSignature(rawBody: string, signature: string | null): Promise<boolean> {
  if (!signature || !PAYSTACK_SECRET_KEY) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(PAYSTACK_SECRET_KEY),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const computed = Array.from(new Uint8Array(mac))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  // Constant-time comparison, so response timing can't leak how much of
  // the signature was correct.
  if (computed.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < computed.length; i++) {
    mismatch |= computed.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}

export default {
  fetch: async (req: Request) => {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    // Must read as raw text BEFORE any JSON.parse — the signature covers
    // the exact bytes Paystack sent, not a re-serialized version.
    const rawBody = await req.text();
    const signature = req.headers.get("x-paystack-signature");

    if (!(await isValidSignature(rawBody, signature))) {
      return new Response("Invalid signature", { status: 401 });
    }

    let event: { event?: string; data?: { reference?: string; metadata?: { order_id?: string } } };
    try {
      event = JSON.parse(rawBody);
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    if (event.event === "charge.success") {
      const reference = event.data?.reference;
      const orderId = event.data?.metadata?.order_id;

      if (reference && orderId) {
        // Safe to call even if verify-paystack-payment already handled
        // this order — mark_order_paid only acts once, on whichever path
        // reaches it first.
        await supabaseAdmin.rpc("mark_order_paid", {
          p_order_id: orderId,
          p_reference: reference,
        });
      }
    }

    // Always acknowledge quickly, even for events we don't act on —
    // Paystack expects a 200 response.
    return new Response("OK", { status: 200 });
  },
};
