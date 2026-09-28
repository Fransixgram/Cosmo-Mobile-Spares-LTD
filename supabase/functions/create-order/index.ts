import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

interface OrderItemInput {
  productId: number;
  productName: string;
  unitPrice: number;
  quantity: number;
}

interface CreateOrderRequestBody {
  fullName: string;
  phone: string;
  email: string;
  deliveryMethod: "delivery" | "pickup";
  address: string | null;
  state: string | null;
  city: string | null;
  landmark: string | null;
  subtotal: number;
  deliveryFee: number;
  total: number;
  items: OrderItemInput[];
}

export default {
  fetch: withSupabase({ auth: ["publishable"] }, async (req, ctx) => {
    let body: CreateOrderRequestBody;
    try {
      body = await req.json();
    } catch {
      return Response.json({ success: false, error: "Invalid request body." }, { status: 400 });
    }

    if (!body.items || body.items.length === 0) {
      return Response.json({ success: false, error: "Order has no items." }, { status: 400 });
    }

    // Create the order using the admin client — bypasses RLS, since this
    // function IS the trusted, server-side path guests go through.
    const { data: order, error: orderError } = await ctx.supabaseAdmin
      .from("orders")
      .insert({
        full_name: body.fullName,
        phone: body.phone,
        email: body.email,
        delivery_method: body.deliveryMethod,
        address: body.address,
        state: body.state,
        city: body.city,
        landmark: body.landmark,
        subtotal: body.subtotal,
        delivery_fee: body.deliveryFee,
        total: body.total,
      })
      .select("id")
      .single();

    if (orderError || !order) {
      return Response.json(
        { success: false, error: "Couldn't create order." },
        { status: 500 }
      );
    }

    const orderItemsPayload = body.items.map((item) => ({
      order_id: order.id,
      product_id: item.productId,
      product_name: item.productName,
      unit_price: item.unitPrice,
      quantity: item.quantity,
      line_total: item.unitPrice * item.quantity,
    }));

    const { error: itemsError } = await ctx.supabaseAdmin
      .from("order_items")
      .insert(orderItemsPayload);

    if (itemsError) {
      // Roll back the order so we don't leave an order with no items.
      await ctx.supabaseAdmin.from("orders").delete().eq("id", order.id);
      return Response.json(
        { success: false, error: "Couldn't save order items." },
        { status: 500 }
      );
    }

    return Response.json({ success: true, orderId: order.id });
  }),
};
