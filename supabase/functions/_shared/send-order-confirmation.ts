const RESEND_API_URL = "https://api.resend.com/emails";

type OrderItem = {
  name: string;
  quantity: number;
  price: number;
};

type OrderDetails = {
  orderId: string;
  customerName: string;
  customerEmail: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  deliveryMethod: "delivery" | "pickup";
  address: string | null;
  city: string | null;
  state: string | null;
  landmark: string | null;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString("en-NG")}`;
}

function formatOrderId(orderId: string): string {
  return orderId.slice(0, 8).toUpperCase();
}

export async function sendOrderConfirmation(
  order: OrderDetails,
): Promise<void> {
  const apiKey = Deno.env.get("RESEND_API_KEY");

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const itemsHtml = order.items
    .map(
      (item) => `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #eee;">
            ${escapeHtml(item.name)}
          </td>
          <td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: center;">
            ${item.quantity}
          </td>
          <td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right;">
            ${formatNaira(item.price * item.quantity)}
          </td>
        </tr>
      `,
    )
    .join("");

  const deliveryDetails =
    order.deliveryMethod === "pickup"
      ? `
        <div style="background:#fff7ed; padding:16px; border-radius:8px; margin-top:24px;">
          <strong>Pickup Order</strong>
          <p style="margin:8px 0 0;">
            Your order will be available for pickup. We'll contact you with
            the next steps.
          </p>
        </div>
      `
      : `
        <div style="background:#f9fafb; padding:16px; border-radius:8px; margin-top:24px;">
          <strong>Delivery Address</strong>
          <p style="margin:8px 0 0;">
            ${escapeHtml(order.address ?? "")}<br>
            ${escapeHtml(order.city ?? "")}, ${escapeHtml(order.state ?? "")}
            ${
              order.landmark
                ? `<br>Landmark: ${escapeHtml(order.landmark)}`
                : ""
            }
          </p>
        </div>
      `;

  const html = `
    <!DOCTYPE html>
    <html>
      <body style="margin:0; padding:0; background:#f7f7f7; font-family:Arial,sans-serif; color:#222;">
        <div style="max-width:600px; margin:40px auto; background:#ffffff; border-radius:12px; overflow:hidden;">

          <div style="background:#b91c1c; padding:28px 24px; text-align:center;">
            <h1 style="margin:0; color:#ffffff; font-size:26px;">
              Cosmo Mobile Spares Ltd
            </h1>
          </div>

          <div style="padding:32px 24px;">
            <h2 style="margin-top:0; color:#111827;">
              Order Confirmed
            </h2>

            <p>
              Hi ${escapeHtml(order.customerName)},
            </p>

            <p>
              Thank you for your order! Your payment has been confirmed and
              your order is now being processed.
            </p>

            <div style="background:#f9fafb; padding:16px; border-radius:8px; margin:24px 0;">
              <strong>Order ID:</strong>
              ${formatOrderId(order.orderId)}
            </div>

            <table style="width:100%; border-collapse:collapse;">
              <thead>
                <tr>
                  <th style="text-align:left; padding-bottom:10px;">Item</th>
                  <th style="text-align:center; padding-bottom:10px;">Qty</th>
                  <th style="text-align:right; padding-bottom:10px;">Amount</th>
                </tr>
              </thead>

              <tbody>
                ${itemsHtml}
              </tbody>

              <tfoot>
                <tr>
                  <td colspan="2" style="padding-top:18px; font-weight:bold;">
                    Subtotal
                  </td>
                  <td style="padding-top:18px; text-align:right; font-weight:bold;">
                    ${formatNaira(order.subtotal)}
                  </td>
                </tr>

                <tr>
                  <td colspan="2" style="padding-top:8px;">
                    Delivery
                  </td>
                  <td style="padding-top:8px; text-align:right;">
                    ${
                      order.deliveryFee === 0
                        ? "Free"
                        : formatNaira(order.deliveryFee)
                    }
                  </td>
                </tr>

                <tr>
                  <td colspan="2" style="padding-top:14px; font-weight:bold;">
                    Total
                  </td>
                  <td style="padding-top:14px; text-align:right; font-weight:bold; color:#b91c1c;">
                    ${formatNaira(order.total)}
                  </td>
                </tr>
              </tfoot>
            </table>

            ${deliveryDetails}

            <p style="margin-top:28px;">
              We'll contact you with the next steps for your order.
            </p>

            <p>
              Thanks for choosing <strong>Cosmo Mobile Spares Ltd</strong>.
            </p>
          </div>

          <div style="background:#111827; padding:20px 24px; text-align:center; color:#d1d5db; font-size:13px;">
            Cosmo Mobile Spares Ltd<br>
            Shop 26, Fesrach Plaza, Back of BRT, Ikotun, Lagos State
          </div>

        </div>
      </body>
    </html>
  `;

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Cosmo Mobile Spares <onboarding@resend.dev>",
      to: [order.customerEmail],
      subject: `Order ${formatOrderId(order.orderId)} confirmed — Cosmo Mobile Spares`,
      html,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Resend API error (${response.status}): ${errorText}`,
    );
  }
}
