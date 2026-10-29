import { createClient } from "npm:@supabase/supabase-js@2";
import { sendOrderConfirmation } from "../_shared/send-order-confirmation.ts";

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

async function isValidSignature(
  rawBody: string,
  signature: string | null,
): Promise<boolean> {
  if (!signature || !PAYSTACK_SECRET_KEY) return false;

  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(PAYSTACK_SECRET_KEY),
      { name: "HMAC", hash: "SHA-512" },
      false,
      ["sign"],
    );

    const mac = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(rawBody),
    );

    const computed = Array.from(new Uint8Array(mac))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");

    if (computed.length !== signature.length) return false;

    let mismatch = 0;
    for (let i = 0; i < computed.length; i++) {
      mismatch |= computed.charCodeAt(i) ^ signature.charCodeAt(i);
    }

    return mismatch === 0;
  } catch (error) {
    console.error("Failed to validate Paystack signature:", error);
    return false;
  }
}

function okResponse() {
  return new Response("OK", { status: 200 });
}

async function deliverOrderConfirmation(orderId: string) {
  if (!supabaseAdmin) {
    return { success: false, retryable: true };
  }

  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .select(
      "id, full_name, email, delivery_method, address, state, city, landmark, subtotal, delivery_fee, total, payment_status",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (orderError || !order) {
    console.error("Could not load order for confirmation email:", orderError);
    return { success: false, retryable: true };
  }

  if (order.payment_status !== "paid") {
    console.error("Refusing to email an order that is not marked paid.");
    return { success: false, retryable: false };
  }

  const { data: orderItems, error: itemsError } = await supabaseAdmin
    .from("order_items")
    .select("product_name, unit_price, quantity")
    .eq("order_id", orderId);

  if (itemsError || !orderItems) {
    console.error("Could not load order items for confirmation:", itemsError);
    return { success: false, retryable: true };
  }

  const { data: claimed, error: claimError } = await supabaseAdmin.rpc(
    "claim_order_confirmation_email",
    { p_order_id: orderId },
  );

  if (claimError) {
    console.error("Could not claim confirmation email:", claimError);
    return { success: false, retryable: true };
  }

  if (claimed !== true) {
    // A different handler may be sending the email, or it was already sent.
    return { success: true, retryable: false };
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
      return { success: false, retryable: true };
    }

    return { success: true, retryable: false };
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

    return { success: false, retryable: true };
  }
}

export default {
  fetch: async (req: Request) => {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    if (
      !PAYSTACK_SECRET_KEY ||
      !SUPABASE_URL ||
      !SUPABASE_SERVICE_ROLE_KEY ||
      !supabaseAdmin
    ) {
      console.error("Webhook server configuration is incomplete.");
      return new Response("Server configuration error", { status: 500 });
    }

    const rawBody = await req.text();
    const signature = req.headers.get("x-paystack-signature");

    if (!(await isValidSignature(rawBody, signature))) {
      return new Response("Invalid signature", { status: 401 });
    }

    let event: {
      event?: string;
      data?: {
        reference?: string;
        metadata?: { order_id?: string } | string | null;
      };
    };

    try {
      event = JSON.parse(rawBody);
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    if (event.event !== "charge.success") {
      return okResponse();
    }

    const reference = event.data?.reference;
    const eventMetadata = event.data?.metadata;

    const orderId =
      eventMetadata &&
      typeof eventMetadata === "object" &&
      !Array.isArray(eventMetadata)
        ? eventMetadata.order_id
        : undefined;

    if (!reference || !orderId) {
      console.error("Paystack event is missing its reference or order ID.");
      return okResponse();
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
      return new Response("Payment verification temporarily unavailable", {
        status: 500,
      });
    }

    let paystackResult: any;

    try {
      paystackResult = await paystackResponse.json();
    } catch (error) {
      console.error("Could not parse Paystack verification response:", error);
      return new Response("Invalid Paystack verification response", {
        status: 500,
      });
    }

    if (!paystackResponse.ok || !paystackResult?.status) {
      console.error(
        "Paystack transaction verification failed:",
        paystackResult?.message ?? paystackResponse.status,
      );
      return new Response("Payment verification temporarily failed", {
        status: 500,
      });
    }

    const transaction = paystackResult?.data;
    const transactionMetadata = transaction?.metadata;

    const verifiedOrderId =
      transactionMetadata &&
      typeof transactionMetadata === "object" &&
      !Array.isArray(transactionMetadata)
        ? transactionMetadata.order_id
        : undefined;

    if (
      transaction?.status !== "success" ||
      transaction?.reference !== reference ||
      transaction?.currency !== "NGN" ||
      transactionMetadata == null ||
      verifiedOrderId !== orderId ||
      transaction?.amount == null
    ) {
      console.error("Paystack transaction details failed verification.", {
        reference,
        orderId,
      });
      return okResponse();
    }

    const { data: expectedOrder, error: expectedOrderError } =
      await supabaseAdmin
        .from("orders")
        .select("id, total")
        .eq("id", orderId)
        .maybeSingle();

    if (expectedOrderError) {
      console.error("Could not load order for payment verification:", expectedOrderError);
      return new Response("Could not load order", { status: 500 });
    }

    if (!expectedOrder) {
      console.error("Verified transaction references an unknown order:", orderId);
      return okResponse();
    }

    const expectedAmountKobo = Math.round(Number(expectedOrder.total) * 100);
    const paidAmountKobo = Number(transaction.amount);

    if (
      !Number.isSafeInteger(expectedAmountKobo) ||
      !Number.isSafeInteger(paidAmountKobo) ||
      paidAmountKobo !== expectedAmountKobo
    ) {
      console.error("Paystack amount does not match order total.", {
        orderId,
        reference,
        expectedAmountKobo,
        paidAmountKobo,
      });
      return okResponse();
    }

    const { data: orderWasMarkedPaid, error: updateError } =
      await supabaseAdmin.rpc("mark_order_paid", {
        p_order_id: orderId,
        p_reference: reference,
      });

    if (updateError) {
      console.error("Failed to mark verified order as paid:", updateError);
      return new Response("Failed to update order", { status: 500 });
    }

    if (orderWasMarkedPaid !== true) {
      // Another handler may have processed this payment. Confirm the same
      // reference is already recorded before attempting email recovery.
      const { data: currentOrder, error: currentOrderError } =
        await supabaseAdmin
          .from("orders")
          .select("payment_status, paystack_reference")
          .eq("id", orderId)
          .maybeSingle();

      if (
        currentOrderError ||
        currentOrder?.payment_status !== "paid" ||
        currentOrder?.paystack_reference !== reference
      ) {
        console.error("Order was not confirmed paid with this reference.");
        return okResponse();
      }
    }

    // Both newly paid and already-paid orders can recover a failed email.
    const delivery = await deliverOrderConfirmation(orderId);

    if (delivery.retryable) {
      // Ask Paystack to retry if the email could not be processed. Payment
      // remains recorded; mark_order_paid prevents a second stock deduction.
      return new Response("Confirmation processing needs retry", {
        status: 500,
      });
    }

    return okResponse();
  },
};
