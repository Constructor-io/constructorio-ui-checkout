import { randomUUID } from "crypto";
import { Router } from "express";
import {
  Client as SquareClient,
  Environment as SquareEnvironment,
} from "square/legacy";

export function createSquareRouter(): Router | null {
  const SQUARE_APPLICATION_ID = process.env.SQUARE_APPLICATION_ID;
  const SQUARE_LOCATION_ID = process.env.SQUARE_LOCATION_ID;
  const SQUARE_ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN;

  const squareEnabled = Boolean(
    SQUARE_APPLICATION_ID && SQUARE_LOCATION_ID && SQUARE_ACCESS_TOKEN,
  );
  if (!squareEnabled) {
    console.warn(
      "Square disabled: missing one of SQUARE_APPLICATION_ID, SQUARE_LOCATION_ID, SQUARE_ACCESS_TOKEN.\n" +
        "The /square demo flow will return 503 until these env vars are set.",
    );
    return null;
  }

  const square = new SquareClient({
    accessToken: SQUARE_ACCESS_TOKEN!,
    environment: SquareEnvironment.Sandbox,
  });
  const router = Router();

  // ---------------------------------------------------------------------------
  // Square (custom PSP) — sandbox integration.
  // POST /api/square/session  → { applicationId, locationId, sessionId }
  // POST /api/square/pay      → charges via the Square SDK PaymentsApi.
  // ---------------------------------------------------------------------------
  router.post("/api/square/session", (_req, res) => {
    res.json({
      applicationId: SQUARE_APPLICATION_ID,
      locationId: SQUARE_LOCATION_ID,
      sessionId: randomUUID(),
    });
  });

  router.post("/api/square/pay", async (req, res) => {
    const { token, sessionId, amountCents } = (req.body || {}) as {
      token?: string;
      sessionId?: string;
      amountCents?: number;
    };
    if (!token || !sessionId || typeof amountCents !== "number") {
      res
        .status(400)
        .json({ error: "token, sessionId, and amountCents are required" });
      return;
    }
    try {
      const { result } = await square.paymentsApi.createPayment({
        sourceId: token,
        idempotencyKey: sessionId,
        amountMoney: { amount: BigInt(amountCents), currency: "USD" },
        locationId: SQUARE_LOCATION_ID!,
      });
      res.json({ success: true, paymentId: result.payment?.id });
    } catch (err) {
      console.error("Error creating Square payment:", err);
      const message =
        err instanceof Error ? err.message : "Square payment failed";
      res.status(500).json({ success: false, error: message });
    }
  });

  return router;
}
