import { useEffect, useMemo, useRef } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";

import { Button } from "@constructor-io/constructorio-ui-components";

import {
  CioCheckoutProvider,
  CioCheckoutStep,
  CioShopPayPaymentStep,
  createSessionStorageAdapter,
  useCioCheckout,
} from "@constructor-io/constructorio-ui-checkout";
import type {
  CheckoutRouterAdapter,
  ShopPayMoney,
  ShopPayPaymentRequest,
  ShopPayReceiptStatus,
  ShopPaySessionResponse,
} from "@constructor-io/constructorio-ui-checkout";

import { OrderSummary } from "../../components/checkoutParts";
import { useAuth } from "../../contexts/AuthContext";
import { useCart, type CartItem } from "../../contexts/CartContext";
import { BASE_PATH } from "./ShopPayApp";

const STORAGE_KEY = "cio-checkout::demo:shop-pay";

// Public: the browser SDK sends both to Shopify. The Shop channel of the
// constructor-shop-pay-demo store, the one SHOP_PAY_STORE_DOMAIN points at.
const SHOP_ID = "107882774609";
const CLIENT_ID = "06afd0ca-7184-4282-ad0f-f5183ddbbe4d";

const usd = (amount: number): ShopPayMoney => ({
  amount: Math.round(amount * 100) / 100,
  currencyCode: "USD",
});

const FREE_SHIPPING = {
  code: "standard",
  label: "Standard shipping",
  amount: usd(0),
};

// What the popup shows. The server builds the request it submits from the
// same items again, so a price changed here never reaches Shopify.
function toPaymentRequest(items: CartItem[]): ShopPayPaymentRequest {
  const total = items.reduce((n, i) => n + i.price * i.quantity, 0);
  return {
    lineItems: items.map((i) => ({
      label: i.name,
      quantity: i.quantity,
      originalItemPrice: usd(i.price),
      finalItemPrice: usd(i.price),
      originalLinePrice: usd(i.price * i.quantity),
      finalLinePrice: usd(i.price * i.quantity),
      requiresShipping: true,
    })),
    shippingLines: [FREE_SHIPPING],
    deliveryMethods: [FREE_SHIPPING],
    totalShippingPrice: { finalTotal: usd(0) },
    discountCodes: [],
    subtotal: usd(total),
    total: usd(total),
    locale: "en",
    presentmentCurrency: "USD",
  };
}

const toServerItems = (items: CartItem[]) =>
  items.map((i) => ({ name: i.name, amount: i.price, quantity: i.quantity }));

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error ?? data.message ?? `Request failed (${res.status})`);
  }
  return data as T;
}

export default function ShopPayCheckout() {
  const navigate = useNavigate();
  const cart = useCart();
  const auth = useAuth();

  const routerAdapter = useMemo<CheckoutRouterAdapter>(
    () => ({
      push: (path) => navigate(path),
      getCurrentPath: () => location.pathname,
      subscribe: (cb) => {
        const handler = () => cb(location.pathname);
        addEventListener("popstate", handler);
        return () => removeEventListener("popstate", handler);
      },
    }),
    [navigate],
  );

  return (
    <main className="page-checkout">
      {/* No onCreateSession: Shop Pay starts its own session when the
          shopper clicks the button. */}
      <CioCheckoutProvider<"shop-pay", unknown, CartItem>
        provider="shop-pay"
        key={`shop-pay:${auth.user?.id ?? "anon"}`}
        steps={[
          {
            id: "payment",
            path: `${BASE_PATH}/checkout/payment`,
            guard: (s) => s.cartSnapshot.length > 0,
          },
          { id: "complete", path: `${BASE_PATH}/checkout/complete` },
        ]}
        router={routerAdapter}
        storage={createSessionStorageAdapter<CartItem>()}
        storageKey={STORAGE_KEY}
        storageAutoResume
        autoStart
        cart={cart.items}
        cartItemFields={{ id: "id", quantity: "quantity", unitAmount: "price" }}
        onEvent={(evt) => {
          if (evt.type === "error")
            console.error("[shop-pay]", evt.source, evt.error);
        }}
      >
        <Routes>
          <Route index element={<Navigate to="payment" replace />} />
          <Route path="payment" element={<Pay />} />
          <Route path="complete" element={<Done />} />
        </Routes>
      </CioCheckoutProvider>
    </main>
  );
}

function Pay() {
  const cart = useCart();
  const items = cart.items;
  const paymentRequest = useMemo(() => toPaymentRequest(items), [items]);

  return (
    <CioCheckoutStep id="payment">
      <section className="step">
        <div className="step-header">
          <h2>Payment</h2>
          <p className="muted">
            Sign in to Shop and pay with a saved card nicknamed test_card
            (4242 4242 4242 4242). Shop Pay only renders on localhost and
            allowed origins.
          </p>
        </div>
        <OrderSummary shippingRate={null} />
        <CioShopPayPaymentStep
          shopId={SHOP_ID}
          clientId={CLIENT_ID}
          paymentRequest={paymentRequest}
          onSessionRequest={() =>
            postJson<ShopPaySessionResponse>("/api/shop-pay/session", {
              items: toServerItems(items),
            })
          }
          onSubmitPayment={async ({ token, paymentMethod }) => {
            const body = await postJson<{
              success: boolean;
              message: string;
              token?: string;
            }>("/api/shop-pay/submit", {
              token,
              paymentMethod,
              items: toServerItems(items),
            });
            if (!body.success || !body.token) throw new Error(body.message);
            return body.token;
          }}
          onCheckReceipt={async (receiptToken) => {
            const res = await fetch(
              `/api/shop-pay/receipt?token=${encodeURIComponent(receiptToken)}`,
            );
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
              throw new Error(data.error ?? `Receipt check failed (${res.status})`);
            }
            return data as ShopPayReceiptStatus;
          }}
        />
      </section>
    </CioCheckoutStep>
  );
}

function Done() {
  const flow = useCioCheckout<"shop-pay">();
  const cart = useCart();
  const navigate = useNavigate();
  const clearedRef = useRef(false);

  // The step only advances on a completed receipt, so the order exists.
  useEffect(() => {
    if (clearedRef.current) return;
    clearedRef.current = true;
    cart.clear();
    void flow.clearState();
  }, [cart, flow]);

  return (
    <section className="step">
      <div className="success-block">
        <h3>Thanks — your order is confirmed</h3>
        <p>Shop Pay completed the payment. It is a test order.</p>
        <Button
          type="button"
          variant="default"
          onClick={() => navigate(BASE_PATH)}
        >
          Done
        </Button>
      </div>
    </section>
  );
}
