import { createHmac, randomUUID } from "crypto";
import { Router } from "express";

// ---------------------------------------------------------------------------
// Fiserv CommerceHub (CERT) — hosted card fields.
// POST /api/fiserv/session → FiservPaymentSession (credentials + merchant ids)
//   Signs the credentials call. The browser inits the Fiserv SDK with the
//   result; the card data never touches this server.
// POST /api/fiserv/charge  → { success, message }
//   Charges the captured session for the cart total. Fiserv burns a session
//   on first use, so a retry needs a new session.
// ---------------------------------------------------------------------------

type FiservEnv = {
  apiKey: string;
  apiSecret: string;
  merchantId: string;
  terminalId: string;
  baseUrl: string;
};

type CredentialsResponse = {
  accessToken?: string;
  publicKey?: string;
  keyId?: string;
  sessionId?: string;
};

type ChargeResponse = {
  gatewayResponse?: {
    transactionState?: string;
    transactionProcessingDetails?: { transactionId?: string };
  };
  paymentReceipt?: {
    processorResponseDetails?: {
      responseMessage?: string;
      approvalStatus?: string;
      approvalCode?: string;
    };
  };
  error?: { field?: string; code?: string; message?: string }[];
};

type LineItem = { amount: number; quantity?: number };

const isLineItem = (item: unknown): item is LineItem =>
  typeof item === "object" &&
  item !== null &&
  typeof (item as LineItem).amount === "number" &&
  Number.isFinite((item as LineItem).amount) &&
  (item as LineItem).amount >= 0 &&
  ((item as LineItem).quantity === undefined ||
    (Number.isInteger((item as LineItem).quantity) &&
      (item as LineItem).quantity! > 0));

// Demo only: the prices come from the browser. A real server looks them up.
const cartTotal = (items: LineItem[]) =>
  Math.round(
    items.reduce((sum, i) => sum + i.amount * (i.quantity ?? 1), 0) * 100,
  ) / 100;

function signedHeaders(env: FiservEnv, payload: string) {
  const clientRequestId = randomUUID();
  const timestamp = Date.now();
  const message = env.apiKey + clientRequestId + timestamp + payload;
  return {
    "Content-Type": "application/json",
    "Client-Request-Id": clientRequestId,
    "Api-Key": env.apiKey,
    Timestamp: String(timestamp),
    "Auth-Token-Type": "HMAC",
    Authorization: createHmac("sha256", env.apiSecret)
      .update(message)
      .digest("base64"),
  };
}

async function fiservPost<T>(env: FiservEnv, path: string, body: object) {
  const payload = JSON.stringify(body);
  const response = await fetch(`${env.baseUrl}${path}`, {
    method: "POST",
    headers: signedHeaders(env, payload),
    body: payload,
  });
  const text = await response.text();
  let raw = {} as T;
  try {
    raw = JSON.parse(text) as T;
  } catch {
    // Non-JSON body; callers report the raw text.
  }
  return { status: response.status, raw, text };
}

function chargeFailureMessage(raw: ChargeResponse, status: number, text: string) {
  const [first] = raw.error ?? [];
  // CERT reports a used or expired session under a `source…` field.
  if (first?.field?.startsWith("source")) {
    return "This payment session was already charged or has expired. Start checkout again.";
  }
  if (first?.message) {
    return `Payment declined: ${first.message}${first.code ? ` (code ${first.code})` : ""}`;
  }
  const processor = raw.paymentReceipt?.processorResponseDetails?.responseMessage;
  return processor
    ? `Payment declined: ${processor}`
    : `Payment failed with ${status}: ${text}`;
}

export function createFiservRouter(): Router | null {
  const env: FiservEnv = {
    apiKey: process.env.COMMERCEHUB_API_KEY ?? "",
    apiSecret: process.env.COMMERCEHUB_API_SECRET ?? "",
    merchantId: process.env.COMMERCEHUB_MERCHANT_ID ?? "",
    terminalId: process.env.COMMERCEHUB_TERMINAL_ID ?? "",
    baseUrl:
      process.env.COMMERCEHUB_BASE_URL ?? "https://connect-cert.fiservapis.com/ch",
  };

  if (!env.apiKey || !env.apiSecret || !env.merchantId || !env.terminalId) {
    console.warn(
      "Fiserv disabled: missing one of COMMERCEHUB_API_KEY, COMMERCEHUB_API_SECRET, COMMERCEHUB_MERCHANT_ID, COMMERCEHUB_TERMINAL_ID.\n" +
        "The /fiserv demo flow will return 503 until these env vars are set.",
    );
    return null;
  }

  const merchantDetails = {
    merchantId: env.merchantId,
    terminalId: env.terminalId,
  };
  const router = Router();

  router.post("/api/fiserv/session", async (_req, res) => {
    try {
      const { status, raw, text } = await fiservPost<CredentialsResponse>(
        env,
        "/payments-vas/v1/security/credentials",
        { merchantDetails },
      );
      if (status !== 201) {
        throw new Error(`Fiserv credentials failed with ${status}: ${text}`);
      }
      if (!raw.accessToken || !raw.publicKey || !raw.keyId || !raw.sessionId) {
        throw new Error(
          "Fiserv returned 201 without accessToken, publicKey, keyId or sessionId",
        );
      }
      res.json({
        sessionId: raw.sessionId,
        accessToken: raw.accessToken,
        publicKey: raw.publicKey,
        keyId: raw.keyId,
        apiKey: env.apiKey,
        merchantId: env.merchantId,
        terminalId: env.terminalId,
        environment: env.baseUrl.includes("cert") ? "cert" : "prod",
      });
    } catch (err) {
      console.error("Error creating Fiserv session:", err);
      const message = err instanceof Error ? err.message : "Fiserv session failed";
      res.status(500).json({ error: message });
    }
  });

  router.post("/api/fiserv/charge", async (req, res) => {
    const { sessionId, items } = (req.body || {}) as {
      sessionId?: string;
      items?: unknown;
    };
    if (!sessionId || !Array.isArray(items) || !items.every(isLineItem)) {
      res.status(400).json({
        success: false,
        message: "sessionId and a non-empty items array are required",
      });
      return;
    }
    const total = cartTotal(items);
    if (total <= 0) {
      res
        .status(400)
        .json({ success: false, message: "Cart total must be greater than zero" });
      return;
    }
    try {
      const { status, raw, text } = await fiservPost<ChargeResponse>(
        env,
        "/payments/v1/charges",
        {
          amount: { total, currency: "USD" },
          source: { sourceType: "PaymentSession", sessionId },
          transactionDetails: { captureFlag: true },
          merchantDetails,
        },
      );
      const approved =
        raw.paymentReceipt?.processorResponseDetails?.approvalStatus ===
        "APPROVED";
      if (status !== 201 || !approved) {
        res.json({
          success: false,
          message: chargeFailureMessage(raw, status, text),
        });
        return;
      }
      console.log(
        `Fiserv charge approved: ${total.toFixed(2)} USD` +
          ` state=${raw.gatewayResponse?.transactionState ?? "unknown"}` +
          ` transactionId=${raw.gatewayResponse?.transactionProcessingDetails?.transactionId ?? "unknown"}`,
      );
      res.json({
        success: true,
        message: `Payment of ${total.toFixed(2)} USD received.`,
        transactionId:
          raw.gatewayResponse?.transactionProcessingDetails?.transactionId,
      });
    } catch (err) {
      console.error("Error charging Fiserv session:", err);
      const message = err instanceof Error ? err.message : "Charge failed";
      res.status(500).json({ success: false, message });
    }
  });

  return router;
}
