import { createClient } from "npm:@supabase/supabase-js@2";
import { sendOrderConfirmation } from "../_shared/send-order-confirmation.ts";

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
);

async function isValidSignature(
  rawBody: string,
  signature: string | null,
): Promise<boolean> {
  if (!signature || !PAYSTACK_SECRET_KEY) return false;

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
}

export default {
  fetch: async (req: Request) => {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
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
        metadata?: {
          order_id?: string;
        };
      };
    };

    try {
      event = JSON.parse(rawBody);
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    if (event.event === "charge.success") {
      const reference = event.data?.reference;
      const orderId = event.data?.metadata?.order_id;

      if (reference && orderId) {
        // This returns true only if THIS call changed the order
        // from unpaid to paid.
        const { data: orderWasMarkedPaid, error: updateError } =
          await supabaseAdmin.rpc("mark_order_paid", {
            p_order_id: orderId,
            p_reference: reference,
          });

        if (updateError) {
          console.error(
            "Failed to mark order as paid:",
            updateError,
          );

          // Return 500 so Paystack can retry the webhook.
          return new Response("Failed to process payment", {
            status: 500,
          });
        }

        // If another payment-confirmation path already processed
        // this order, don't send another confirmation email.
        if (orderWasMarkedPaid !== true) {
          return new Response("OK", { status: 200 });
        }

        // Fetch the complete order details for the email.
        const { data: order, error: orderError } =
          await supabaseAdmin
            .from("orders")
            .select(
              "id, full_name, email, delivery_method, address, state, city, landmark, subtotal, delivery_fee, total",
            )
            .eq("id", orderId)
            .single();

        if (orderError || !order) {
          console.error(
            "Payment succeeded, but order could not be loaded for email:",
            orderError,
          );

          // Payment is already successful. Don't make Paystack
          // think the payment itself failed.
          return new Response("OK", { status: 200 });
        }

        // Fetch the products/items belonging to the order.
        const { data: orderItems, error: orderItemsError } =
          await supabaseAdmin
            .from("order_items")
            .select("product_name, unit_price, quantity")
            .eq("order_id", orderId);

        if (orderItemsError || !orderItems) {
          console.error(
            "Payment succeeded, but order items could not be loaded for email:",
            orderItemsError,
          );

          return new Response("OK", { status: 200 });
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
              order.delivery_method === "pickup"
                ? "pickup"
                : "delivery",
            address: order.address,
            city: order.city,
            state: order.state,
            landmark: order.landmark,
          });

          console.log(
            `Order confirmation email sent for order ${orderId}`,
          );
        } catch (emailError) {
          // Payment remains successful even if Resend fails.
          console.error(
            "Payment succeeded, but confirmation email failed:",
            emailError,
          );
        }
      }
    }

    return new Response("OK", { status: 200 });
  },
};
