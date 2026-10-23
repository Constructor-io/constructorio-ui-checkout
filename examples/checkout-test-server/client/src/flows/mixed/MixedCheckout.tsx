import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";

import { Button } from "@constructor-io/constructorio-ui-components";

import {
  CioCheckoutProvider,
  CioCheckoutStep,
  CioFulfillmentStep,
  CioStripePaymentStep,
  createSessionStorageAdapter,
  useCioCheckout,
} from "@constructor-io/constructorio-ui-checkout";
import type { CheckoutRouterAdapter } from "@constructor-io/constructorio-ui-checkout";

import CodePanel from "../../components/CodePanel";
import {
  AddressPicker,
  OrderSummary,
  ShippingPicker,
} from "../../components/checkoutParts";
import { useAuth } from "../../contexts/AuthContext";
import { useCart, type CartItem } from "../../contexts/CartContext";
import { api, Address, ShippingRate } from "../../lib/api";
import { fmtUsd } from "../../lib/constants";
import { BASE_PATH } from "./MixedApp";
import { MIXED_SNIPPET } from "./snippet";

interface MixedState {
  addressId?: string;
  shippingId?: string;
  giftWrap?: boolean;
  giftMessage?: string;
}

const GIFT_WRAP_PRICE = 5;

export default function MixedCheckout() {
  const auth = useAuth();
  const cart = useCart();
  const navigate = useNavigate();

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

  const config = useMemo(
    () => ({
      steps: [
        { id: "address", path: `${BASE_PATH}/checkout/details` },
        { id: "shipping" },
        { id: "gift-wrap", path: `${BASE_PATH}/checkout/gift` },
        {
          id: "payment",
          path: `${BASE_PATH}/checkout/payment`,
          guard: (s) => s.cartSnapshot.length > 0,
        },
        { id: "complete", path: `${BASE_PATH}/checkout/complete` },
      ],
      router: routerAdapter,
      storage: createSessionStorageAdapter<CartItem>(),
      storageKey: `cio-checkout::demo:mixed:${auth.user?.id ?? "anon"}`,
      storageAutoResume: true,
      autoStart: true,
      initialState: {} as MixedState,
      cart: cart.items,
      cartItemFields: {
        id: "id",
        quantity: "quantity",
        unitAmount: "price",
      } as const,
      onCreateSession: async (state) => {
        const meta = state.metadata as MixedState;
        const items = state.cartSnapshot.map((i) => ({
          name: i.name,
          amount: i.price,
          quantity: i.quantity,
        }));
        if (meta.giftWrap)
          items.push({
            name: "Gift wrap",
            amount: GIFT_WRAP_PRICE,
            quantity: 1,
          });
        const res = await api.createCheckoutSession({
          items,
          addressId: meta.addressId,
          shippingId: meta.shippingId,
        });
        return {
          clientSecret: res.clientSecret,
          publishableKey: res.publishableKey,
        };
      },
      onUpdateSession: async (patch) => {
        const meta = (patch.metadata || {}) as MixedState;
        const src =
          patch.items?.map((i) => ({
            name: i.name,
            amount: i.price,
            quantity: i.quantity,
          })) ??
          cart.items.map((i) => ({
            name: i.name,
            amount: i.price,
            quantity: i.quantity,
          }));
        if (meta.giftWrap)
          src.push({ name: "Gift wrap", amount: GIFT_WRAP_PRICE, quantity: 1 });
        const res = await api.updateCheckoutSession({
          items: src,
          addressId: meta.addressId,
          shippingId: meta.shippingId,
        });
        return {
          clientSecret: res.clientSecret,
          publishableKey: res.publishableKey,
        };
      },
      onEvent: (evt) => {
        if (evt.type === "error")
          console.error("[mixed]", evt.source, evt.error);
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }),
    [routerAdapter, cart.items, auth.user?.id],
  );

  return (
    <main className="page-checkout">
      <CioCheckoutProvider<"stripe", MixedState, CartItem>
        provider="stripe"
        key={`mixed:${auth.user?.id ?? "anon"}`}
        {...config}
      >
        <Routes>
          <Route index element={<Navigate to="details" replace />} />
          <Route path="details" element={<Details />} />
          <Route path="gift" element={<Gift />} />
          <Route path="payment" element={<Pay />} />
          <Route path="complete" element={<Done />} />
        </Routes>
      </CioCheckoutProvider>
      <CodePanel title="Wiring the 'mixed' flow" code={MIXED_SNIPPET} />
    </main>
  );
}

function Details() {
  const flow = useCioCheckout<"stripe", MixedState, CartItem>();
  const cart = useCart();
  const meta = flow.getIntegratorState();
  const [rate, setRate] = useState<ShippingRate | undefined>();

  useEffect(() => {
    flow.setCart(cart.items);
  }, [cart.items, flow]);

  const pickAddress = useCallback(
    (addr: Address) => {
      setRate(undefined);
      flow.setIntegratorState((prev) => ({
        ...prev,
        addressId: addr.id,
        shippingId: undefined,
      }));
      void flow.next();
    },
    [flow],
  );

  const pickShipping = useCallback(
    (r: ShippingRate) => {
      setRate(r);
      flow.setIntegratorState((prev) => ({ ...prev, shippingId: r.id }));
      void flow.next();
    },
    [flow],
  );

  const currentSub = flow.state.currentStepId;
  const subs = [
    { id: "address", label: "Address" },
    { id: "shipping", label: "Shipping" },
  ] as const;
  const currentSubIdx = subs.findIndex((s) => s.id === currentSub);

  return (
    <section className="step">
      <div className="step-header">
        <h2>Details</h2>
      </div>
      <ol className="mixed-breadcrumb" aria-label="Sub-step progress">
        {subs.map((s, idx) => {
          const state =
            idx === currentSubIdx
              ? "active"
              : idx < currentSubIdx
                ? "done"
                : "pending";
          return (
            <li key={s.id} className={`mixed-crumb ${state}`}>
              <span className="mixed-crumb-num">{idx + 1}</span>
              <span>{s.label}</span>
            </li>
          );
        })}
      </ol>

      <CioCheckoutStep id="address">
        <div className="mixed-substep">
          <h3>Ship to</h3>
          <AddressPicker value={meta.addressId} onChange={pickAddress} />
        </div>
      </CioCheckoutStep>

      <CioCheckoutStep id="shipping">
        <div className="mixed-substep">
          <h3>Delivery</h3>
          <ShippingPicker
            addressId={meta.addressId}
            value={meta.shippingId}
            onChange={pickShipping}
          />
          <div className="step-actions">
            <Button type="button" variant="outline" onClick={() => flow.back()}>
              ← Change address
            </Button>
          </div>
        </div>
      </CioCheckoutStep>
      {void rate}
    </section>
  );
}

function Gift() {
  const flow = useCioCheckout<"stripe", MixedState, CartItem>();
  const meta = flow.getIntegratorState();

  const toggleGiftWrap = () => {
    flow.setIntegratorState((prev) => ({ ...prev, giftWrap: !prev.giftWrap }));
  };

  return (
    <CioCheckoutStep id="gift-wrap">
      <section className="step">
        <div className="step-header">
          <h2>Gift options</h2>
        </div>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={!!meta.giftWrap}
            onChange={toggleGiftWrap}
          />
          Wrap it (+{fmtUsd(GIFT_WRAP_PRICE)})
        </label>
        <OrderSummary />
        <div className="step-actions">
          <Button type="button" variant="outline" onClick={() => flow.back()}>
            ← Back to shipping
          </Button>
          <Button type="button" variant="default" onClick={() => flow.next()}>
            Continue to payment →
          </Button>
        </div>
      </section>
    </CioCheckoutStep>
  );
}

function Pay() {
  const flow = useCioCheckout<"stripe", MixedState, CartItem>();
  return (
    <CioCheckoutStep id="payment">
      <section className="step">
        <div className="step-header">
          <h2>Payment</h2>
        </div>
        <CioStripePaymentStep uiMode="elements" />
        <div className="step-actions">
          <Button type="button" variant="outline" onClick={() => flow.back()}>
            ← Back
          </Button>
        </div>
      </section>
    </CioCheckoutStep>
  );
}

function Done() {
  const flow = useCioCheckout<"stripe", MixedState, CartItem>();
  const cart = useCart();
  const navigate = useNavigate();
  const clearedRef = useRef(false);
  return (
    <section className="step">
      <div className="step-header">
        <h2>Order confirmed</h2>
      </div>
      <CioFulfillmentStep
        onFulfill={async () => {
          const session = flow.getSession();
          if (!session) return { success: false, message: "No session" };
          const [sessionId] = session.clientSecret.split("_secret_");
          return api.fulfill(sessionId);
        }}
        onFulfillComplete={async (result) => {
          if (result.success && !clearedRef.current) {
            clearedRef.current = true;
            cart.clear();
            await flow.clearState();
          }
        }}
        render={({ status, result }) => {
          if (status === "pending")
            return <div className="muted">Verifying…</div>;
          if (status === "fulfilled") {
            return (
              <div className="success-block">
                <h3>Thanks — order confirmed 🎉</h3>
                <p>{result?.message}</p>
                <Button
                  type="button"
                  variant="default"
                  onClick={() => navigate(BASE_PATH)}
                >
                  Done
                </Button>
              </div>
            );
          }
          return <div className="error-block">{result?.message}</div>;
        }}
      />
    </section>
  );
}
