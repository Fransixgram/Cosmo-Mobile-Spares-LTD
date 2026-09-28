import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

// The server is the source of truth for the delivery fee. Keep this in sync
// with getDeliveryFee() in src/lib/delivery.ts until real delivery pricing
// exists.
const DELIVERY_FEE_NAIRA = 0;
const MAX_LINE_QUANTITY = 100;
const MAX_TEXT_LENGTH = 300;

interface OrderItemInput {
  productId: number;
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
  expectedTotal?: number;
  items: OrderItemInput[];
}

// Expected problems (bad input, out of stock, price changed) come back as a
// normal 200 response with success: false, so the frontend can show the
// message. Real failures use 4xx/5xx status codes.
function fail(error: string) {
  return Response.json({ success: false, error });
}

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export default {
  fetch: withSupabase({ auth: ["publishable"] }, async (req, ctx) => {
    let body: CreateOrderRequestBody;
    try {
      body = await req.json();
    } catch {
      return Response.json({ success: false, error: "Invalid request body." }, { status: 400 });
    }

    // --- Validate customer details ---
    const fullName = cleanText(body.fullName);
    const phone = cleanText(body.phone);
    const email = cleanText(body.email);
    const address = cleanText(body.address);
    const state = cleanText(body.state);
    const city = cleanText(body.city);
    const landmark = cleanText(body.landmark);

    if (!fullName || !phone || !email) {
      return fail("Name, phone number and email are required.");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return fail("Please enter a valid email address.");
    }
    if (
      [fullName, phone, email, address, state, city, landmark].some(
        (text) => text.length > MAX_TEXT_LENGTH
      )
    ) {
      return fail("One of the fields is too long.");
    }
    if (body.deliveryMethod !== "delivery" && body.deliveryMethod !== "pickup") {
      return fail("Please choose delivery or pickup.");
    }
    const isPickup = body.deliveryMethod === "pickup";
    if (!isPickup && (!address || !state || !city)) {
      return fail("Delivery address, state and city are required.");
    }

    // --- Validate items, merging duplicate product IDs ---
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return fail("Your cart is empty.");
    }

    const quantityById = new Map<number, number>();
    for (const item of body.items) {
      const productId = item?.productId;
      const quantity = item?.quantity;
      if (
        !Number.isInteger(productId) ||
        !Number.isInteger(quantity) ||
        quantity < 1
      ) {
        return fail("One of the items in your cart is invalid.");
      }
      quantityById.set(productId, (quantityById.get(productId) ?? 0) + quantity);
    }

    for (const quantity of quantityById.values()) {
      if (quantity > MAX_LINE_QUANTITY) {
        return fail("Quantity is too high for one of the items.");
      }
    }

    // --- Look up the REAL price and stock from the database ---
    const productIds = [...quantityById.keys()];
    const { data: products, error: productsError } = await ctx.supabaseAdmin
      .from("products")
      .select("id, name, price, stock, is_active")
      .in("id", productIds);

    if (productsError || !products) {
      return Response.json(
        { success: false, error: "Couldn't check product availability." },
        { status: 500 }
      );
    }

    const productById = new Map(products.map((product) => [product.id, product]));

    const lines: {
      productId: number;
      productName: string;
      unitPrice: number;
      quantity: number;
      lineTotal: number;
    }[] = [];

    for (const [productId, quantity] of quantityById) {
      const product = productById.get(productId);

      if (!product || !product.is_active) {
        return fail(
          "An item in your cart is no longer available. Please review your cart."
        );
      }
      if (product.stock < 1) {
        return fail(`"${product.name}" is out of stock.`);
      }
      if (quantity > product.stock) {
        return fail(
          `Only ${product.stock} of "${product.name}" left in stock. Please lower the quantity.`
        );
      }

      const unitPrice = Number(product.price);
      lines.push({
        productId,
        productName: product.name,
        unitPrice,
        quantity,
        lineTotal: roundMoney(unitPrice * quantity),
      });
    }

    // --- Calculate the money on the server ---
    const subtotal = roundMoney(lines.reduce((sum, line) => sum + line.lineTotal, 0));
    const deliveryFee = isPickup ? 0 : DELIVERY_FEE_NAIRA;
    const total = roundMoney(subtotal + deliveryFee);

    // If the price the customer saw is not the price we calculated, stop
    // BEFORE payment, so they never pay one amount for an order saved at another.
    if (
      typeof body.expectedTotal === "number" &&
      Math.abs(body.expectedTotal - total) > 0.005
    ) {
      return fail(
        "Prices in your cart have changed. Please review your cart and try again."
      );
    }

    // --- Save the order (admin client bypasses RLS; this function is the trusted path) ---
    const { data: order, error: orderError } = await ctx.supabaseAdmin
      .from("orders")
      .insert({
        full_name: fullName,
        phone,
        email,
        delivery_method: body.deliveryMethod,
        address: isPickup ? null : address,
        state: isPickup ? null : state,
        city: isPickup ? null : city,
        landmark: isPickup ? null : landmark || null,
        subtotal,
        delivery_fee: deliveryFee,
        total,
      })
      .select("id")
      .single();

    if (orderError || !order) {
      return Response.json(
        { success: false, error: "Couldn't create order." },
        { status: 500 }
      );
    }

    const orderItemsPayload = lines.map((line) => ({
      order_id: order.id,
      product_id: line.productId,
      product_name: line.productName,
      unit_price: line.unitPrice,
      quantity: line.quantity,
      line_total: line.lineTotal,
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

    return Response.json({ success: true, orderId: order.id, total });
  }),
};
