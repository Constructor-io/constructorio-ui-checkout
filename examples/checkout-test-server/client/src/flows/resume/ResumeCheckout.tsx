import { useCallback, useMemo, useRef, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";

import { Button } from "@constructor-io/constructorio-ui-components";

import {
  CioCheckoutProvider,
  CioCheckoutStep,
  CioFulfillmentStep,
  CioStripePaymentStep,
  useCioCheckout,
} from "@constructor-io/constructorio-ui-checkout";
import type {
  CheckoutFlowState,
  CheckoutRouterAdapter,
  CheckoutStorageAdapter,
} from "@constructor-io/constructorio-ui-checkout";

import CodePanel from "../../components/CodePanel";
import {
  AddressPicker,
  OrderSummary,
  RecommendationsRail,
  ShippingPicker,
} from "../../components/checkoutParts";
import { useAuth } from "../../contexts/AuthContext";
import { useCart, type CartItem } from "../../contexts/CartContext";
import { api, Address, ShippingRate } from "../../lib/api";
import { BASE_PATH } from "./ResumeApp";
import { RESUME_SNIPPET } from "./snippet";

interface ResumeState {
  addressId?: string;
  shippingId?: string;
}

export default function ResumeCheckout() {
  const navigate = useNavigate();
  const cart = useCart();
  const auth = useAuth();

  const routerAdapter = useMemo<CheckoutRouterAdapter>(
    () => ({
      push: (path) => navigate(path),
      replace: (path) => navigate(path, { replace: true }),
      getCurrentPath: () => location.pathname,
      subscribe: (cb) => {
        const handler = () => cb(location.pathname);
        addEventListener("popstate", handler);
        return () => removeEventListener("popstate", handler);
      },
    }),
    [navigate],
  );

  const backendStorage = useMemo<CheckoutStorageAdapter<CartItem>>(() => {
    const userId = auth.user?.id ?? "anonymous";
    return {
      async load() {
        const { state } = await api.loadFlowState(userId);
        return (state as CheckoutFlowState<CartItem> | null) ?? null;
      },
      async save(_key, state) {
        await api.saveFlowState(userId, state);
      },
      async clear() {
        await api.clearFlowState(userId);
      },
    };
  }, [auth.user?.id]);

  const config = useMemo(
    () => ({
      steps: [
        {
          id: "recommendations",
          path: `${BASE_PATH}/checkout/recommendations`,
        },
        { id: "address", path: `${BASE_PATH}/checkout/address` },
        {
          id: "payment",
          path: `${BASE_PATH}/checkout/payment`,
          guard: (s) => s.cartSnapshot.length > 0,
        },
        { id: "complete", path: `${BASE_PATH}/checkout/complete` },
      ],
      router: routerAdapter,
      storage: backendStorage,
      storageKey: `cio-checkout::user:${auth.user?.id ?? "anonymous"}`,
      storageAutoResume: true,
      autoStart: true,
      initialState: {} as ResumeState,
      cart: cart.items,
      cartItemFields: {
        id: "id",
        quantity: "quantity",
        unitAmount: "price",
      } as const,
      onCreateSession: async (state) => {
        const meta = state.metadata as ResumeState;
        const res = await api.createCheckoutSession({
          items: state.cartSnapshot.map((i) => ({
            name: i.name,
            amount: i.price,
            quantity: i.quantity,
          })),
          addressId: meta.addressId,
          shippingId: meta.shippingId,
        });
        return {
          clientSecret: res.clientSecret,
          publishableKey: res.publishableKey,
        };
      },
      onUpdateSession: async (patch) => {
        const meta = (patch.metadata || {}) as ResumeState;
        const items =
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
        const res = await api.updateCheckoutSession({
          items,
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
          console.error("[resume]", evt.source, evt.error);
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }),
    [routerAdapter, backendStorage, cart.items, auth.user?.id],
  );

  return (
    <main className="page-checkout">
      <CioCheckoutProvider<"stripe", ResumeState, CartItem>
        provider="stripe"
        key={`resume:${auth.user?.id ?? "anon"}`}
        {...config}
      >
        <Routes>
          <Route index element={<Navigate to="recommendations" replace />} />
          <Route path="recommendations" element={<Recs />} />
          <Route path="address" element={<Addr />} />
          <Route path="payment" element={<Pay />} />
          <Route path="complete" element={<Done />} />
        </Routes>
      </CioCheckoutProvider>
      <CodePanel title="Wiring the 'resume' flow" code={RESUME_SNIPPET} />
    </main>
  );
}

function Recs() {
  const flow = useCioCheckout<"stripe", ResumeState, CartItem>();
  const cart = useCart();
  const seed = cart.items[0]?.name ?? "shoes";
  return (
    <CioCheckoutStep id="recommendations">
      <section className="step">
        <div className="step-header">
          <h2>You might also like</h2>
        </div>
        <RecommendationsRail
          seedQuery={seed}
          numResults={4}
          onAdd={async (p) => {
            cart.add({
              id: p.id,
              name: p.name,
              price: p.price,
              imageUrl: p.imageUrl,
            });
            if (flow.getSession()) {
              await flow.updateSession({
                reason: "items",
                items: [
                  ...cart.items,
                  { id: p.id, name: p.name, price: p.price, quantity: 1 },
                ],
              });
            }
          }}
        />
        <div className="step-actions">
          <Button type="button" variant="outline" onClick={() => flow.back()}>
            ← Back
          </Button>
          <Button type="button" variant="default" onClick={() => flow.next()}>
            Continue →
          </Button>
        </div>
      </section>
    </CioCheckoutStep>
  );
}

function Addr() {
  const flow = useCioCheckout<"stripe", ResumeState, CartItem>();
  const cart = useCart();
  const meta = flow.getIntegratorState();
  const [rate, setRate] = useState<ShippingRate | undefined>();
  const canContinue = !!meta.addressId && !!meta.shippingId;

  const pickAddress = useCallback(
    (addr: Address) => {
      setRate(undefined);
      flow.setIntegratorState((prev) => ({
        ...prev,
        addressId: addr.id,
        shippingId: undefined,
      }));
      if (flow.getSession()) {
        void flow.updateSession({
          reason: "address",
          metadata: { addressId: addr.id, shippingId: undefined },
          items: cart.items,
        });
      }
    },
    [flow, cart.items],
  );

  const pickShipping = useCallback(
    (r: ShippingRate) => {
      setRate(r);
      flow.setIntegratorState((prev) => ({ ...prev, shippingId: r.id }));
      if (flow.getSession()) {
        void flow.updateSession({
          reason: "shipping",
          metadata: { addressId: meta.addressId, shippingId: r.id },
          items: cart.items,
        });
      }
    },
    [flow, cart.items, meta.addressId],
  );

  return (
    <CioCheckoutStep id="address">
      <section className="step">
        <div className="step-header">
          <h2>Where should it go?</h2>
        </div>
        <div className="two-col">
          <div>
            <h3>Address</h3>
            <AddressPicker value={meta.addressId} onChange={pickAddress} />
          </div>
          <div>
            <h3>Shipping</h3>
            <ShippingPicker
              addressId={meta.addressId}
              value={meta.shippingId}
              onChange={pickShipping}
            />
          </div>
        </div>
        <OrderSummary shippingRate={rate ?? null} taxRate={0.08} />
        <div className="step-actions">
          <Button type="button" variant="outline" onClick={() => flow.back()}>
            ← Back
          </Button>
          <Button
            type="button"
            variant="default"
            disabled={!canContinue}
            onClick={() => flow.next()}
          >
            Continue →
          </Button>
        </div>
      </section>
    </CioCheckoutStep>
  );
}

function Pay() {
  const flow = useCioCheckout<"stripe", ResumeState, CartItem>();
  const auth = useAuth();
  return (
    <CioCheckoutStep id="payment">
      <section className="step">
        <div className="step-header">
          <h2>Payment</h2>
        </div>
        <CioStripePaymentStep
          uiMode="elements"
          defaultValues={auth.user ? { email: auth.user.email } : undefined}
        />
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
  const flow = useCioCheckout<"stripe", ResumeState, CartItem>();
  const cart = useCart();
  const navigate = useNavigate();
  const clearedRef = useRef(false);
  return (
    <section className="step">
      <div className="step-header">
        <h2>Order confirmation</h2>
      </div>
      <CioFulfillmentStep
        onFulfill={async () => {
          const session = flow.getSession();
          if (!session)
            return { success: false, message: "No session to fulfill" };
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
        render={({ status, result, retry }) => {
          if (status === "pending")
            return <div className="muted">Verifying payment…</div>;
          if (status === "fulfilled") {
            return (
              <div className="success-block">
                <h3>Thanks — your order is confirmed 🎉</h3>
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
          if (status === "failed") {
            return (
              <div className="error-block">
                <p>Fulfillment failed: {result?.message}</p>
                <Button type="button" variant="outline" onClick={retry}>
                  Retry
                </Button>
              </div>
            );
          }
          return null;
        }}
      />
    </section>
  );
}
