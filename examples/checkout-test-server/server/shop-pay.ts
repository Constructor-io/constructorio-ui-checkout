import { randomUUID } from 'crypto';
import { Router } from 'express';

// ---------------------------------------------------------------------------
// Shop Pay Wallet (Shopify Payments test mode) — popup checkout.
// POST /api/shop-pay/session  → { token, checkoutUrl, sourceIdentifier }
//   Storefront API shopPayPaymentRequestSessionCreate from the cart lines.
// POST /api/shop-pay/submit   → { success, message, token?, processingStatusType? }
//   Storefront API shopPayPaymentRequestSessionSubmit. Returns the receipt token.
// GET  /api/shop-pay/receipt?token=… → { state, errorCode?, message? }
//   Admin API receipt lookup. The Storefront API has no query for it.
// ---------------------------------------------------------------------------

// The Storefront API and the Admin API share version names; both calls use this one.
const API_VERSION = '2026-07';
const CURRENCY_CODE = 'USD';

type ShopPayEnv = {
  storeDomain: string;
  storefrontToken: string;
  adminToken: string;
};

type MoneyInput = { amount: string; currencyCode: string };

type LineItem = { amount: number; quantity?: number; name?: string };

type UserError = { field?: string[] | null; message: string };

type ReceiptState = 'processing' | 'completed' | 'action_required' | 'failed';

const isLineItem = (item: unknown): item is LineItem =>
  typeof item === 'object' &&
  item !== null &&
  typeof (item as LineItem).amount === 'number' &&
  Number.isFinite((item as LineItem).amount) &&
  (item as LineItem).amount >= 0 &&
  ((item as LineItem).quantity === undefined ||
    (Number.isInteger((item as LineItem).quantity) &&
      (item as LineItem).quantity! > 0)) &&
  ((item as LineItem).name === undefined ||
    typeof (item as LineItem).name === 'string');

// The Storefront API types MoneyInput.amount as Decimal, serialized as a string.
const money = (amount: number): MoneyInput => ({
  amount: amount.toFixed(2),
  currencyCode: CURRENCY_CODE,
});

// Demo only: the prices come from the browser. A real server looks them up,
// and replies to the popup's address, delivery and discount events with its
// own totals. This demo has one free shipping option and no discounts.
function buildPaymentRequest(items: LineItem[], paymentMethod?: string) {
  const total =
    Math.round(
      items.reduce((sum, i) => sum + i.amount * (i.quantity ?? 1), 0) * 100
    ) / 100;
  return {
    lineItems: items.map((item) => {
      const quantity = item.quantity ?? 1;
      const itemPrice = money(item.amount);
      const linePrice = money(item.amount * quantity);
      return {
        label: item.name || 'Item',
        quantity,
        originalItemPrice: itemPrice,
        finalItemPrice: itemPrice,
        originalLinePrice: linePrice,
        finalLinePrice: linePrice,
        requiresShipping: true,
      };
    }),
    shippingLines: [
      { label: 'Standard shipping', code: 'standard', amount: money(0) },
    ],
    totalShippingPrice: { originalTotal: money(0), finalTotal: money(0) },
    selectedDeliveryMethodType: 'SHIPPING',
    subtotal: money(total),
    total: money(total),
    locale: 'en',
    presentmentCurrency: CURRENCY_CODE,
    ...(paymentMethod ? { paymentMethod } : {}),
  };
}

const describeUserErrors = (errors: UserError[]) =>
  errors
    .map(({ field, message }) =>
      field?.length ? `${field.join('.')}: ${message}` : message
    )
    .join('; ');

async function shopifyGraphql<T>(
  api: 'Storefront API' | 'Admin API',
  url: string,
  headers: Record<string, string>,
  query: string,
  variables: Record<string, unknown>
): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ query, variables }),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${api} failed with ${response.status}: ${text}`);
  }
  let raw: { data?: T; errors?: { message: string }[] };
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error(`${api} returned non-JSON: ${text}`);
  }
  if (raw.errors?.length) {
    throw new Error(
      `${api} error: ${raw.errors.map((e) => e.message).join('; ')}`
    );
  }
  return raw.data as T;
}

const SESSION_CREATE_MUTATION = `
  mutation ShopPaySessionCreate($sourceIdentifier: String!, $paymentRequest: ShopPayPaymentRequestInput!) {
    shopPayPaymentRequestSessionCreate(sourceIdentifier: $sourceIdentifier, paymentRequest: $paymentRequest) {
      shopPayPaymentRequestSession { token checkoutUrl sourceIdentifier }
      userErrors { field message }
    }
  }
`;

const SESSION_SUBMIT_MUTATION = `
  mutation ShopPaySessionSubmit($token: String!, $paymentRequest: ShopPayPaymentRequestInput!, $idempotencyKey: String!) {
    shopPayPaymentRequestSessionSubmit(token: $token, paymentRequest: $paymentRequest, idempotencyKey: $idempotencyKey) {
      paymentRequestReceipt { token processingStatusType }
      userErrors { field message }
    }
  }
`;

const RECEIPT_QUERY = `
  query ShopPayReceipt($token: String!) {
    shopPayPaymentRequestReceipt(token: $token) {
      processingStatus { state errorCode message }
    }
  }
`;

type SessionCreateData = {
  shopPayPaymentRequestSessionCreate?: {
    shopPayPaymentRequestSession?: {
      token?: string;
      checkoutUrl?: string;
      sourceIdentifier?: string;
    } | null;
    userErrors: UserError[];
  };
};

type SessionSubmitData = {
  shopPayPaymentRequestSessionSubmit?: {
    paymentRequestReceipt?: {
      token?: string;
      processingStatusType?: string;
    } | null;
    userErrors: UserError[];
  };
};

type ReceiptData = {
  shopPayPaymentRequestReceipt?: {
    processingStatus: {
      state: string;
      errorCode?: string | null;
      message?: string | null;
    };
  } | null;
};

// READY means Shopify queued the payment and has not processed it yet.
const RECEIPT_STATES: Record<string, ReceiptState> = {
  READY: 'processing',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  ACTION_REQUIRED: 'action_required',
  FAILED: 'failed',
};

const validItems = (items: unknown): items is LineItem[] =>
  Array.isArray(items) && items.length > 0 && items.every(isLineItem);

export function createShopPayRouter(): Router | null {
  const env: ShopPayEnv = {
    // Accepts "store.myshopify.com" or the full "https://…/" admin URL.
    storeDomain: (process.env.SHOP_PAY_STORE_DOMAIN ?? '')
      .replace(/^https?:\/\//, '')
      .replace(/\/+$/, ''),
    storefrontToken: process.env.SHOP_PAY_STOREFRONT_TOKEN ?? '',
    adminToken: process.env.SHOP_PAY_ADMIN_API ?? '',
  };

  if (!env.storeDomain || !env.storefrontToken || !env.adminToken) {
    console.warn(
      'Shop Pay disabled: missing one of SHOP_PAY_STORE_DOMAIN, SHOP_PAY_STOREFRONT_TOKEN, SHOP_PAY_ADMIN_API.\n' +
        'The /shop-pay demo flow will return 503 until these env vars are set.'
    );
    return null;
  }

  // The Shop Pay plan's app only has a public Storefront token. The
  // private-token header always gets 403 ACCESS_DENIED.
  const storefront = <T>(query: string, variables: Record<string, unknown>) =>
    shopifyGraphql<T>(
      'Storefront API',
      `https://${env.storeDomain}/api/${API_VERSION}/graphql.json`,
      { 'X-Shopify-Storefront-Access-Token': env.storefrontToken },
      query,
      variables
    );

  const router = Router();

  router.post('/api/shop-pay/session', async (req, res) => {
    const { items } = (req.body || {}) as { items?: unknown };
    if (!validItems(items)) {
      res.status(400).json({ error: 'A non-empty items array is required' });
      return;
    }
    const paymentRequest = buildPaymentRequest(items);
    if (Number(paymentRequest.total.amount) <= 0) {
      res.status(400).json({ error: 'Cart total must be greater than zero' });
      return;
    }
    try {
      // sourceIdentifier must be unique across all orders.
      const data = await storefront<SessionCreateData>(
        SESSION_CREATE_MUTATION,
        { sourceIdentifier: randomUUID(), paymentRequest }
      );
      const payload = data?.shopPayPaymentRequestSessionCreate;
      if (payload?.userErrors?.length) {
        throw new Error(
          `Shop Pay session failed: ${describeUserErrors(payload.userErrors)}`
        );
      }
      const session = payload?.shopPayPaymentRequestSession;
      if (
        !session?.token ||
        !session.checkoutUrl ||
        !session.sourceIdentifier
      ) {
        throw new Error('Shopify returned no Shop Pay session');
      }
      res.json({
        token: session.token,
        checkoutUrl: session.checkoutUrl,
        sourceIdentifier: session.sourceIdentifier,
      });
    } catch (err) {
      console.error('Error creating Shop Pay session:', err);
      const message =
        err instanceof Error ? err.message : 'Shop Pay session failed';
      res.status(500).json({ error: message });
    }
  });

  router.post('/api/shop-pay/submit', async (req, res) => {
    const { token, items, paymentMethod } = (req.body || {}) as {
      token?: unknown;
      items?: unknown;
      paymentMethod?: unknown;
    };
    if (typeof token !== 'string' || !token || !validItems(items)) {
      res.status(400).json({
        success: false,
        message: 'token and a non-empty items array are required',
      });
      return;
    }
    if (paymentMethod !== undefined && typeof paymentMethod !== 'string') {
      res
        .status(400)
        .json({ success: false, message: 'Invalid payment method' });
      return;
    }
    // A real server reserves inventory here and rejects sold-out lines.
    const paymentRequest = buildPaymentRequest(items, paymentMethod);
    if (Number(paymentRequest.total.amount) <= 0) {
      res
        .status(400)
        .json({
          success: false,
          message: 'Cart total must be greater than zero',
        });
      return;
    }
    try {
      // A new key per submit. Shopify runs a retried request only once.
      const data = await storefront<SessionSubmitData>(
        SESSION_SUBMIT_MUTATION,
        { token, paymentRequest, idempotencyKey: randomUUID() }
      );
      const payload = data?.shopPayPaymentRequestSessionSubmit;
      if (payload?.userErrors?.length) {
        res.json({
          success: false,
          message: `Shop Pay payment failed: ${describeUserErrors(payload.userErrors)}`,
        });
        return;
      }
      const receipt = payload?.paymentRequestReceipt;
      if (!receipt?.token || !receipt.processingStatusType) {
        res.json({
          success: false,
          message: 'Shopify returned no Shop Pay receipt',
        });
        return;
      }
      res.json({
        success: true,
        message: `Payment of ${paymentRequest.total.amount} USD submitted to Shop Pay.`,
        token: receipt.token,
        processingStatusType: receipt.processingStatusType,
      });
    } catch (err) {
      console.error('Error submitting Shop Pay payment:', err);
      const message = err instanceof Error ? err.message : 'Payment failed';
      res.status(500).json({ success: false, message });
    }
  });

  router.get('/api/shop-pay/receipt', async (req, res) => {
    const token = String(req.query.token || '');
    if (!token) {
      res.status(400).json({ error: 'token query param required' });
      return;
    }
    try {
      const data = await shopifyGraphql<ReceiptData>(
        'Admin API',
        `https://${env.storeDomain}/admin/api/${API_VERSION}/graphql.json`,
        { 'X-Shopify-Access-Token': env.adminToken },
        RECEIPT_QUERY,
        { token }
      );
      const status = data?.shopPayPaymentRequestReceipt?.processingStatus;
      if (!status) {
        res.status(404).json({ error: 'No Shop Pay receipt for this token' });
        return;
      }
      const state = RECEIPT_STATES[status.state];
      if (!state) {
        throw new Error(`Unknown Shop Pay receipt state: ${status.state}`);
      }
      res.json({
        state,
        ...(status.errorCode ? { errorCode: status.errorCode } : {}),
        ...(status.message ? { message: status.message } : {}),
      });
    } catch (err) {
      console.error('Error looking up Shop Pay receipt:', err);
      const message =
        err instanceof Error ? err.message : 'Receipt lookup failed';
      res.status(500).json({ error: message });
    }
  });

  return router;
}
