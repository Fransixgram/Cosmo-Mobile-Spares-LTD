import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");

interface VerifyRequestBody {
  orderId: string;
  reference: string;
}

export default {
  fetch: withSupabase({ auth: ["publishable"] }, async (req, ctx) => {
    if (!PAYSTACK_SECRET_KEY) {
      return Response.json(
        { success: false, error: "Server misconfiguration: missing Paystack secret key." },
        { status: 500 }
      );
    }

    let body: VerifyRequestBody;
    try {
      body = await req.json();
    } catch {
      return Response.json({ success: false, error: "Invalid request body." }, { status: 400 });
    }

    const { orderId, reference } = body;
    if (!orderId || !reference) {
      return Response.json(
        { success: false, error: "orderId and reference are required." },
        { status: 400 }
      );
    }

    // Look up the order first, using the admin client (bypasses RLS — guests
    // can't SELECT orders per our policies, but this function needs to).
    const { data: order, error: orderError } = await ctx.supabaseAdmin
      .from("orders")
      .select("id, total, payment_status")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return Response.json({ success: false, error: "Order not found." }, { status: 404 });
    }

    // Idempotency: if this order was already marked paid, don't re-process.
    if (order.payment_status === "paid") {
      return Response.json({ success: true, alreadyPaid: true });
    }

    // Verify the transaction directly with Paystack's servers, using the
    // secret key. This is the one step that can never happen in the browser.
    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const paystackResult = await paystackResponse.json();

    if (!paystackResponse.ok || paystackResult?.data?.status !== "success") {
      return Response.json(
        { success: false, error: "Payment could not be verified." },
        { status: 400 }
      );
    }

    // Security check: confirm the amount actually paid matches this order's
    // total, in kobo (Paystack amounts are in the smallest currency unit).
    // Stops a cheap payment's reference being replayed against a pricier order.
    const expectedAmountKobo = Math.round(Number(order.total) * 100);
    const paidAmountKobo = paystackResult.data.amount;

    if (paidAmountKobo !== expectedAmountKobo) {
      return Response.json(
        { success: false, error: "Paid amount does not match order total." },
        { status: 400 }
      );
    }

    // Genuine, matching payment confirmed — update the order.
    const { error: updateError } = await ctx.supabaseAdmin
      .from("orders")
      .update({
        payment_status: "paid",
        paystack_reference: reference,
        order_status: "Confirmed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (updateError) {
      return Response.json(
        { success: false, error: "Payment verified, but order update failed." },
        { status: 500 }
      );
    }

    return Response.json({ success: true });
  }),
};
