import { Router } from "express";
import Stripe from "stripe";

type ShippingRate = {
  id: string;
  label: string;
  amount: number;
  etaDays: string;
};

type FindShipping = (
  addressId?: string,
  shippingId?: string,
) => ShippingRate | undefined;

interface CheckoutItem {
  name: string;
  amount: number;
  quantity?: number;
  priceId?: string;
}

export function createStripeRouter(options: {
  clientUrl: string;
  findShipping: FindShipping;
}): Router | null {
  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
  const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY;

  if (!STRIPE_SECRET_KEY || !STRIPE_PUBLISHABLE_KEY) {
    console.warn(
      "Stripe disabled: missing STRIPE_SECRET_KEY or STRIPE_PUBLISHABLE_KEY in .env file.\n" +
        "Copy .env.example to .env and add your Stripe test keys to enable the Stripe flow.",
    );
    return null;
  }

  const { clientUrl, findShipping } = options;
  const stripe = new Stripe(STRIPE_SECRET_KEY);
  const router = Router();

  function buildSessionParams(body: {
    items?: CheckoutItem[];
    addressId?: string;
    shippingId?: string;
    uiMode?: "elements" | "form";
  }): Stripe.Checkout.SessionCreateParams {
    const { items, addressId, shippingId, uiMode = "elements" } = body;

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
      items?.length
        ? items.map((item) => {
            if (item.priceId)
              return { price: item.priceId, quantity: item.quantity || 1 };
            return {
              price_data: {
                currency: "usd",
                product_data: { name: item.name },
                unit_amount: Math.round(item.amount * 100),
              },
              quantity: item.quantity || 1,
            };
          })
        : [
            {
              price_data: {
                currency: "usd",
                product_data: { name: "Test Product" },
                unit_amount: 1999,
              },
              quantity: 1,
            },
          ];

    // Turn selected shipping into a Stripe shipping option.
    const rate = findShipping(addressId, shippingId);
    const shippingOptions:
      | Stripe.Checkout.SessionCreateParams.ShippingOption[]
      | undefined = rate
      ? [
          {
            shipping_rate_data: {
              display_name: rate.label,
              type: "fixed_amount",
              fixed_amount: {
                amount: Math.round(rate.amount * 100),
                currency: "usd",
              },
              delivery_estimate: {
                minimum: { unit: "business_day", value: 1 },
                maximum: { unit: "business_day", value: 8 },
              },
            },
          },
        ]
      : undefined;

    return {
      ui_mode: uiMode === "form" ? "form" : "elements",
      mode: "payment",
      line_items: lineItems,
      customer_email: "demo@example.com",
      ...(shippingOptions ? { shipping_options: shippingOptions } : {}),
      return_url: `${clientUrl}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
    };
  }

  router.post("/api/checkout-session", async (req, res) => {
    try {
      const session = await stripe.checkout.sessions.create(
        buildSessionParams(req.body || {}),
      );
      const rate = findShipping(req.body?.addressId, req.body?.shippingId);
      res.json({
        clientSecret: session.client_secret,
        publishableKey: STRIPE_PUBLISHABLE_KEY,
        shippingApplied: rate
          ? { id: rate.id, label: rate.label, amount: rate.amount }
          : null,
      });
    } catch (err) {
      console.error("Error creating checkout session:", err);
      const message =
        err instanceof Error ? err.message : "Internal server error";
      res.status(500).json({ error: message });
    }
  });

  // Explicit update endpoint — same shape, different name for clarity in the client.
  router.post("/api/checkout-session/update", async (req, res) => {
    try {
      const session = await stripe.checkout.sessions.create(
        buildSessionParams(req.body || {}),
      );
      const rate = findShipping(req.body?.addressId, req.body?.shippingId);
      res.json({
        clientSecret: session.client_secret,
        publishableKey: STRIPE_PUBLISHABLE_KEY,
        shippingApplied: rate
          ? { id: rate.id, label: rate.label, amount: rate.amount }
          : null,
      });
    } catch (err) {
      console.error("Error updating checkout session:", err);
      const message =
        err instanceof Error ? err.message : "Internal server error";
      res.status(500).json({ error: message });
    }
  });

  router.get("/api/checkout-session/:sessionId/status", async (req, res) => {
    try {
      const session = await stripe.checkout.sessions.retrieve(
        req.params.sessionId,
      );
      res.json({
        status: session.status,
        paymentStatus: session.payment_status,
        customerEmail: session.customer_details?.email,
        amountTotal: session.amount_total,
        currency: session.currency,
      });
    } catch (err) {
      console.error("Error retrieving session:", err);
      const message =
        err instanceof Error ? err.message : "Internal server error";
      res.status(500).json({ error: message });
    }
  });

  router.post("/api/checkout-session/:sessionId/fulfill", async (req, res) => {
    try {
      const session = await stripe.checkout.sessions.retrieve(
        req.params.sessionId,
      );
      if (session.payment_status === "paid") {
        res.json({
          success: true,
          message: `Order fulfilled! Payment of ${((session.amount_total || 0) / 100).toFixed(2)} ${(session.currency || "usd").toUpperCase()} received.`,
        });
      } else {
        res.json({
          success: false,
          message: `Payment not yet confirmed. Status: ${session.payment_status}`,
        });
      }
    } catch (err) {
      console.error("Error during fulfillment:", err);
      const message =
        err instanceof Error ? err.message : "Fulfillment check failed";
      res.status(500).json({ success: false, message });
    }
  });

  return router;
}
