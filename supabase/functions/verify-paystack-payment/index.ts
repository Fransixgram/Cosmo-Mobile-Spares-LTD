import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { sendOrderConfirmation } from "../_shared/send-order-confirmation.ts";

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");

interface VerifyRequestBody {
  orderId: string;
  reference: string;
}

export default {
  fetch: withSupabase({ auth: ["publishable"] }, async (req, ctx) => {
    if (!PAYSTACK_SECRET_KEY) {
      return Response.json(
        {
          success: false,
          error: "Server misconfiguration: missing Paystack secret key.",
        },
        { status: 500 },
      );
    }

    let body: VerifyRequestBody;
    try {
      body = await req.json();
    } catch {
      return Response.json(
        { success: false, error: "Invalid request body." },
        { status: 400 },
      );
    }

    const { orderId, reference } = body;

    if (!orderId || !reference) {
      return Response.json(
        { success: false, error: "orderId and reference are required." },
        { status: 400 },
      );
    }

    // Look up the order first.
    const { data: order, error: orderError } = await ctx.supabaseAdmin
      .from("orders")
      .select(
        "id, full_name, email, delivery_method, address, state, city, landmark, subtotal, delivery_fee, total, payment_status",
      )
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return Response.json(
        { success: false, error: "Order not found." },
        { status: 404 },
      );
    }

    // Idempotency: if this order was already marked paid, don't re-process
    // it or send another confirmation email.
    if (order.payment_status === "paid") {
      return Response.json({ success: true, alreadyPaid: true });
    }

    // Verify the transaction directly with Paystack's servers.
    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      },
    );

    const paystackResult = await paystackResponse.json();

    if (
      !paystackResponse.ok ||
      paystackResult?.data?.status !== "success"
    ) {
      return Response.json(
        { success: false, error: "Payment could not be verified." },
        { status: 400 },
      );
    }

    // Confirm the amount actually paid matches this order's total.
    const expectedAmountKobo = Math.round(Number(order.total) * 100);
    const paidAmountKobo = paystackResult.data.amount;

    if (paidAmountKobo !== expectedAmountKobo) {
      return Response.json(
        {
          success: false,
          error: "Paid amount does not match order total.",
        },
        { status: 400 },
      );
    }

    // Genuine, matching payment confirmed.
    // The database function returns true only when THIS call actually changed
    // the order from unpaid to paid.
    const { data: orderWasMarkedPaid, error: updateError } =
      await ctx.supabaseAdmin.rpc("mark_order_paid", {
        p_order_id: orderId,
        p_reference: reference,
      });

    if (updateError) {
      return Response.json(
        {
          success: false,
          error: "Payment verified, but order update failed.",
        },
        { status: 500 },
      );
    }

    // If another payment-confirmation path already marked this order paid,
    // don't send another confirmation email.
    if (orderWasMarkedPaid !== true) {
      return Response.json({
        success: true,
        alreadyPaid: true,
      });
    }

    // Fetch the order items only after payment has successfully transitioned
    // from unpaid to paid.
    const { data: orderItems, error: orderItemsError } =
      await ctx.supabaseAdmin
        .from("order_items")
        .select("product_name, unit_price, quantity")
        .eq("order_id", orderId);

    if (orderItemsError || !orderItems) {
      // Payment is already successful. Don't report it as a failed payment
      // just because the confirmation email data couldn't be loaded.
      console.error(
        "Payment succeeded, but order items could not be loaded for email:",
        orderItemsError,
      );

      return Response.json({
        success: true,
        emailSent: false,
      });
    }

    try {
      await sendOrderConfirmation({
        orderId: order.id,
        customerName: order.full_name,
        customerEmail: order.email,
        items: orderItems.map((item) => ({
          name: item.product_name,
          quantity: Number(item.quantity),
          price: Number(item.unit_price),
        })),
        subtotal: Number(order.subtotal),
        deliveryFee: Number(order.delivery_fee),
        total: Number(order.total),
        deliveryMethod:
          order.delivery_method === "pickup" ? "pickup" : "delivery",
        address: order.address,
        city: order.city,
        state: order.state,
        landmark: order.landmark,
      });

      return Response.json({
        success: true,
        emailSent: true,
      });
    } catch (emailError) {
      // Payment remains successful even if Resend fails.
      console.error(
        "Payment succeeded, but confirmation email failed:",
        emailError,
      );

      return Response.json({
        success: true,
        emailSent: false,
      });
    }
  }),
};
