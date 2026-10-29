import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { sendOrderConfirmation } from "../_shared/send-order-confirmation.ts";

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");

interface VerifyRequestBody {
  orderId: string;
  reference: string;
}

async function deliverOrderConfirmation(
  supabaseAdmin: any,
  order: any,
) {
  const orderId = order.id;

  if (order.payment_status !== "paid") {
    return { success: false, emailSent: false };
  }

  const { data: orderItems, error: itemsError } = await supabaseAdmin
    .from("order_items")
    .select("product_name, unit_price, quantity")
    .eq("order_id", orderId);

  if (itemsError || !orderItems) {
    console.error("Could not load order items for confirmation:", itemsError);
    return { success: false, emailSent: false };
  }

  const { data: claimed, error: claimError } = await supabaseAdmin.rpc(
    "claim_order_confirmation_email",
    { p_order_id: orderId },
  );

  if (claimError) {
    console.error("Could not claim confirmation email:", claimError);
    return { success: false, emailSent: false };
  }

  if (claimed !== true) {
    // Another handler may be sending the email, or it may already be sent.
    return { success: true, emailSent: false };
  }

  try {
    await sendOrderConfirmation({
      orderId: order.id,
      customerName: order.full_name,
      customerEmail: order.email,
      items: orderItems.map((item: any) => ({
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

    const { data: finished, error: finishError } =
      await supabaseAdmin.rpc("finish_order_confirmation_email", {
        p_order_id: orderId,
        p_status: "sent",
        p_error: null,
      });

    if (finishError || finished !== true) {
      console.error(
        "Email was sent, but its delivery status could not be saved:",
        finishError,
      );
      return { success: false, emailSent: true };
    }

    return { success: true, emailSent: true };
  } catch (emailError) {
    console.error("Order confirmation email failed:", emailError);

    const { error: finishError } = await supabaseAdmin.rpc(
      "finish_order_confirmation_email",
      {
        p_order_id: orderId,
        p_status: "failed",
        p_error: String(emailError),
      },
    );

    if (finishError) {
      console.error("Could not record email failure:", finishError);
    }

    return { success: false, emailSent: false };
  }
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

    if (
      typeof orderId !== "string" ||
      typeof reference !== "string" ||
      !orderId.trim() ||
      !reference.trim()
    ) {
      return Response.json(
        { success: false, error: "orderId and reference are required." },
        { status: 400 },
      );
    }

    const { data: order, error: orderError } = await ctx.supabaseAdmin
      .from("orders")
      .select(
        "id, full_name, email, delivery_method, address, state, city, landmark, subtotal, delivery_fee, total, payment_status, paystack_reference",
      )
      .eq("id", orderId)
      .maybeSingle();

    if (orderError || !order) {
      return Response.json(
        { success: false, error: "Order not found." },
        { status: 404 },
      );
    }

    // If already paid, verify that this is the same reference before
    // attempting recovery of a pending or failed confirmation email.
    if (order.payment_status === "paid") {
      if (order.paystack_reference !== reference) {
        return Response.json(
          {
            success: false,
            error: "This order has already been paid with a different reference.",
          },
          { status: 409 },
        );
      }

      const delivery = await deliverOrderConfirmation(ctx.supabaseAdmin, order);

      return Response.json({
        success: true,
        alreadyPaid: true,
        emailSent: delivery.emailSent,
      });
    }

    let paystackResponse: Response;

    try {
      paystackResponse = await fetch(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
        {
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          },
        },
      );
    } catch (error) {
      console.error("Paystack verification request failed:", error);
      return Response.json(
        { success: false, error: "Payment verification is temporarily unavailable." },
        { status: 502 },
      );
    }

    let paystackResult: any;

    try {
      paystackResult = await paystackResponse.json();
    } catch {
      return Response.json(
        { success: false, error: "Invalid response from payment provider." },
        { status: 502 },
      );
    }

    const transaction = paystackResult?.data;
    const transactionMetadata = transaction?.metadata;

    if (
      !paystackResponse.ok ||
      !paystackResult?.status ||
      transaction?.status !== "success" ||
      transaction?.reference !== reference ||
      transaction?.currency !== "NGN" ||
      !transactionMetadata ||
      typeof transactionMetadata !== "object" ||
      Array.isArray(transactionMetadata) ||
      transactionMetadata.order_id !== orderId
    ) {
      return Response.json(
        { success: false, error: "Payment could not be verified." },
        { status: 400 },
      );
    }

    const expectedAmountKobo = Math.round(Number(order.total) * 100);
    const paidAmountKobo = Number(transaction.amount);

    if (
      !Number.isSafeInteger(expectedAmountKobo) ||
      !Number.isSafeInteger(paidAmountKobo) ||
      paidAmountKobo !== expectedAmountKobo
    ) {
      return Response.json(
        {
          success: false,
          error: "Paid amount does not match order total.",
        },
        { status: 400 },
      );
    }

    const { data: orderWasMarkedPaid, error: updateError } =
      await ctx.supabaseAdmin.rpc("mark_order_paid", {
        p_order_id: orderId,
        p_reference: reference,
      });

    if (updateError) {
      console.error("Failed to mark verified order as paid:", updateError);
      return Response.json(
        {
          success: false,
          error: "Payment verified, but order update failed.",
        },
        { status: 500 },
      );
    }

    // A concurrent handler may have completed the payment first. Confirm
    // the stored payment and reference match before proceeding.
    let confirmedOrder = order;

    if (orderWasMarkedPaid !== true) {
      const { data: currentOrder, error: currentOrderError } =
        await ctx.supabaseAdmin
          .from("orders")
          .select(
            "id, full_name, email, delivery_method, address, state, city, landmark, subtotal, delivery_fee, total, payment_status, paystack_reference",
          )
          .eq("id", orderId)
          .maybeSingle();

      if (
        currentOrderError ||
        currentOrder?.payment_status !== "paid" ||
        currentOrder?.paystack_reference !== reference
      ) {
        return Response.json(
          {
            success: false,
            error: "Order payment status could not be confirmed.",
          },
          { status: 409 },
        );
      }

      confirmedOrder = currentOrder;
    } else {
      confirmedOrder = {
        ...order,
        payment_status: "paid",
        paystack_reference: reference,
      };
    }

    const delivery = await deliverOrderConfirmation(
      ctx.supabaseAdmin,
      confirmedOrder,
    );

    return Response.json({
      success: true,
      emailSent: delivery.emailSent,
    });
  }),
};
