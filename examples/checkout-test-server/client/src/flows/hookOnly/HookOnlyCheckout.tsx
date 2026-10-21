import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";

import {
  CheckoutElementsProvider,
  PaymentElement,
  useCheckoutElements,
} from "@stripe/react-stripe-js/checkout";
import {
  loadStripe,
  Stripe,
  StripePaymentElementChangeEvent,
} from "@stripe/stripe-js";

import {
  CioCheckoutProvider,
  CioCheckoutStep,
  CioFulfillmentStep,
  createSessionStorageAdapter,
  useCioCheckout,
  useCioCheckoutSession,
} from "@constructor-io/constructorio-ui-checkout";
import type { CheckoutRouterAdapter } from "@constructor-io/constructorio-ui-checkout";

import { Button } from "@constructor-io/constructorio-ui-components";

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
import { BASE_PATH } from "./HookOnlyApp";
import { HOOK_ONLY_SNIPPET } from "./snippet";

const STORAGE_KEY = "cio-checkout::demo:hook-only";

interface HookOnlyState {
  addressId?: string;
  shippingId?: string;
}

const BRAND_APPEARANCE = {
  theme: "stripe" as const,
  variables: {
    fontFamily: "Inter, system-ui, sans-serif",
    fontSizeBase: "15px",
    colorPrimary: "#4338ca",
    colorBackground: "#fefce8",
    colorText: "#111827",
    colorDanger: "#dc2626",
    borderRadius: "10px",
    spacingUnit: "5px",
  },
};

const stripeCache = new Map<string, Promise<Stripe | null>>();
const getStripe = (pk: string) => {
  const cached = stripeCache.get(pk);
  if (cached) return cached;
  const fresh = loadStripe(pk);
  stripeCache.set(pk, fresh);
  return fresh;
};

export default function HookOnlyCheckout() {
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
      storage: createSessionStorageAdapter<CartItem>(),
      storageKey: STORAGE_KEY,
      storageAutoResume: true,
      autoStart: true,
      initialState: {} as HookOnlyState,
      cart: cart.items,
      cartItemFields: {
        id: "id",
        quantity: "quantity",
        unitAmount: "price",
      } as const,
      onCreateSession: async (state) => {
        const meta = state.metadata as HookOnlyState;
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
        const meta = (patch.metadata || {}) as HookOnlyState;
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
          console.error("[hook-only]", evt.source, evt.error);
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }),
    [routerAdapter, cart.items],
  );

  return (
    <main className="page-checkout">
      <CioCheckoutProvider<"stripe", HookOnlyState, CartItem>
        provider="stripe"
        key={`hook-only:${auth.user?.id ?? "anon"}`}
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
      <CodePanel title="Wiring the 'hook-only' flow" code={HOOK_ONLY_SNIPPET} />
    </main>
  );
}

function Recs() {
  const flow = useCioCheckout<"stripe", HookOnlyState, CartItem>();
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
  const flow = useCioCheckout<"stripe", HookOnlyState, CartItem>();
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
  const flow = useCioCheckout<"stripe", HookOnlyState, CartItem>();

  return (
    <CioCheckoutStep id="payment">
      <section className="step">
        <div className="step-header">
          <h2>Payment</h2>
        </div>
        <HookOnlyPayment />
        <div className="step-actions">
          <Button type="button" variant="outline" onClick={() => flow.back()}>
            ← Back
          </Button>
        </div>
      </section>
    </CioCheckoutStep>
  );
}

function HookOnlyPayment() {
  const flow = useCioCheckout<"stripe", HookOnlyState, CartItem>();
  const { session, sessionStatus, retry } = useCioCheckoutSession<"stripe">();

  const stripePromise = useMemo(
    () => (session ? getStripe(session.publishableKey) : null),
    [session],
  );

  if (sessionStatus === "error") {
    return (
      <div className="error-block">
        Failed to prepare checkout.
        <Button type="button" variant="outline" onClick={() => void retry()}>
          Retry
        </Button>
      </div>
    );
  }

  if (!session || !stripePromise) {
    return (
      <div className="muted">Preparing your brand-themed payment form…</div>
    );
  }

  return (
    <div className="hook-only-payment">
      <p className="muted small">
        Drives Stripe via <code>useCioCheckout()</code> +{" "}
        <code>CheckoutElementsProvider</code> — no{" "}
        <code>&lt;CioStripePaymentStep&gt;</code>, custom appearance.
      </p>
      <CheckoutElementsProvider
        stripe={stripePromise}
        options={{
          clientSecret: session.clientSecret,
          elementsOptions: { appearance: BRAND_APPEARANCE },
        }}
      >
        <HookOnlyForm />
      </CheckoutElementsProvider>
    </div>
  );
}

function HookOnlyForm() {
  const flow = useCioCheckout<"stripe", HookOnlyState, CartItem>();
  const checkoutState = useCheckoutElements();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onChange = (evt: StripePaymentElementChangeEvent) =>
    setReady(evt.complete);

  const submit = async () => {
    if (checkoutState.type !== "success" || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await checkoutState.checkout.confirm({
        redirect: "if_required",
      });
      if (result.type === "success") void flow.next();
      else if (result.type === "error") setError(result.error.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (checkoutState.type === "loading")
    return <div className="muted">Loading Stripe…</div>;
  if (checkoutState.type === "error")
    return <div className="error-block">{checkoutState.error.message}</div>;

  const amount = checkoutState.checkout.total.total.amount;

  return (
    <div className="hook-only-form">
      <PaymentElement onChange={onChange} />
      {error && <div className="error-block">{error}</div>}
      <Button
        type="button"
        variant="default"
        disabled={!ready || isSubmitting}
        onClick={submit}
        style={{ marginTop: 12 }}
      >
        {isSubmitting ? "Processing…" : `Pay ${amount}`}
      </Button>
    </div>
  );
}

function Done() {
  const flow = useCioCheckout<"stripe", HookOnlyState, CartItem>();
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
