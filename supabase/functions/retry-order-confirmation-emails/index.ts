import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendOrderConfirmation } from "../_shared/send-order-confirmation.ts";

const corsHeaders = {
  "Access-Control-Allow-Headers": "content-type, x-recovery-secret",
};

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function safeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const left = encoder.encode(a);
  const right = encoder.encode(b);

  if (left.length !== right.length) return false;

  let difference = 0;
  for (let i = 0; i < left.length; i++) {
    difference |= left[i] ^ right[i];
  }

  return difference === 0;
}

function errorMessage(error: unknown): string {
  return (error instanceof Error ? error.message : "Unknown error").slice(0, 2000);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const expectedSecret = Deno.env.get("EMAIL_RECOVERY_SECRET");
  const suppliedSecret = req.headers.get("x-recovery-secret") ?? "";

  if (
    !expectedSecret ||
    expectedSecret.length < 32 ||
    !safeEqual(suppliedSecret, expectedSecret)
  ) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Server configuration error" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const staleBefore = new Date(Date.now() - 15 * 60 * 1000).toISOString();

  // First collect tracked failures and stale claims.
  const { data: tracked, error: trackedError } = await supabase
    .from("order_email_deliveries")
    .select("order_id, status, last_attempt_at")
    .eq("email_type", "order_confirmation")
    .or(
      `status.eq.pending,status.eq.failed,and(status.eq.sending,last_attempt_at.lt.${staleBefore})`,
    )
    .order("last_attempt_at", { ascending: true, nullsFirst: true })
    .limit(25);

  if (trackedError) {
    console.error("Could not load tracked email candidates:", trackedError);
    return jsonResponse({ error: "Could not load recovery candidates" }, 500);
  }

  // Also find paid orders with no tracking row, so a missed initial claim
  // does not permanently exclude their confirmation email from recovery.
   const recentOrdersBefore = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data: paidOrders, error: paidOrdersError } = await supabase
    .from("orders")
    .select("id")
    .eq("payment_status", "paid")
    .gte("updated_at", recentOrdersBefore)
    .order("updated_at", { ascending: true })
    .limit(100);

  if (paidOrdersError) {
    console.error("Could not load paid orders for recovery:", paidOrdersError);
    return jsonResponse({ error: "Could not load paid orders" }, 500);
  }

  const trackedIds = new Set((tracked ?? []).map((row) => row.order_id));
  const missingTrackingIds: string[] = [];

  for (const paidOrder of paidOrders ?? []) {
    if (trackedIds.has(paidOrder.id)) continue;

    const { data: existing, error: existingError } = await supabase
      .from("order_email_deliveries")
      .select("order_id")
      .eq("order_id", paidOrder.id)
      .eq("email_type", "order_confirmation")
      .maybeSingle();

    if (existingError) {
      console.error("Could not check email tracking row:", existingError);
      continue;
    }

    if (!existing) missingTrackingIds.push(paidOrder.id);
    if (missingTrackingIds.length >= 25) break;
  }

  const candidateIds = [
    ...new Set([
      ...(tracked ?? []).map((row) => row.order_id),
      ...missingTrackingIds,
    ]),
  ].slice(0, 25);

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const orderId of candidateIds) {
    let claimed = false;

    try {
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select(
          "id, full_name, email, delivery_method, address, city, state, landmark, subtotal, delivery_fee, total, payment_status",
        )
        .eq("id", orderId)
        .eq("payment_status", "paid")
        .maybeSingle();

      if (orderError) throw orderError;

      if (!order) {
        skipped++;
        continue;
      }

      const { data: claimResult, error: claimError } = await supabase.rpc(
        "claim_order_confirmation_email",
        { p_order_id: order.id },
      );

      if (claimError) throw claimError;

      if (claimResult !== true) {
        skipped++;
        continue;
      }

      claimed = true;

      if (typeof order.email !== "string" || !order.email.trim()) {
        throw new Error("Customer email address is missing.");
      }

      const { data: items, error: itemsError } = await supabase
        .from("order_items")
        .select("product_name, unit_price, quantity")
        .eq("order_id", order.id);

      if (itemsError) throw itemsError;

      if (!items || items.length === 0) {
        throw new Error("Order has no line items; confirmation email was not sent.");
      }

      await sendOrderConfirmation({
        orderId: order.id,
        customerName: order.full_name,
        customerEmail: order.email.trim(),
        items: items.map((item) => ({
          name: item.product_name,
          quantity: item.quantity,
          price: Number(item.unit_price),
        })),
        subtotal: Number(order.subtotal),
        deliveryFee: Number(order.delivery_fee),
        total: Number(order.total),
        deliveryMethod: order.delivery_method === "pickup" ? "pickup" : "delivery",
        address: order.address,
        city: order.city,
        state: order.state,
        landmark: order.landmark,
      });

      const { data: finished, error: finishError } = await supabase.rpc(
        "finish_order_confirmation_email",
        {
          p_order_id: order.id,
          p_status: "sent",
          p_error: null,
        },
      );

      if (finishError || finished !== true) {
        console.error("Email accepted but delivery status update failed:", finishError);
        failed++;
        continue;
      }

      claimed = false;
      sent++;
    } catch (error) {
      const message = errorMessage(error);
      console.error("Email recovery failed for order:", orderId, message);

      if (claimed) {
        const { error: finishError } = await supabase.rpc(
          "finish_order_confirmation_email",
          {
            p_order_id: orderId,
            p_status: "failed",
            p_error: message,
          },
        );

        if (finishError) {
          console.error("Could not record email recovery failure:", finishError);
        }
      }

      failed++;
    }
  }

  return jsonResponse({
    success: failed === 0,
    processed: candidateIds.length,
    sent,
    failed,
    skipped,
  });
});
