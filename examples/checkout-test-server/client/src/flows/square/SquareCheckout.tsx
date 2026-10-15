import { useCallback, useMemo, useRef, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";

import { Button } from "@constructor-io/constructorio-ui-components";

import {
  CioCheckoutProvider,
  CioCheckoutStep,
  CioFulfillmentStep,
  createSessionStorageAdapter,
  useCioCheckout,
} from "@constructor-io/constructorio-ui-checkout";
import type { CheckoutRouterAdapter } from "@constructor-io/constructorio-ui-checkout";

import {
  AddressPicker,
  OrderSummary,
  RecommendationsRail,
  ShippingPicker,
} from "../../components/checkoutParts";
import { useAuth } from "../../contexts/AuthContext";
import { useCart, type CartItem } from "../../contexts/CartContext";
import { Address, ShippingRate } from "../../lib/api";
import { BASE_PATH } from "./SquareApp";
import SquarePaymentStep from "./SquarePaymentStep";

const STORAGE_KEY = "cio-checkout::demo:square";

interface SquareState {
  addressId?: string;
  shippingId?: string;
}

export default function SquareCheckout() {
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
      initialState: {} as SquareState,
      cart: cart.items,
      cartItemFields: {
        id: "id",
        quantity: "quantity",
        unitAmount: "price",
      } as const,
      onCreateSession: async () => {
        const res = await fetch("/api/square/session", { method: "POST" });
        if (!res.ok) throw new Error(`Square session failed (${res.status})`);
        return res.json();
      },
      onUpdateSession: async () => {
        const res = await fetch("/api/square/session", { method: "POST" });
        if (!res.ok)
          throw new Error(`Square session refresh failed (${res.status})`);
        return res.json();
      },
      onEvent: (evt) => {
        if (evt.type === "error")
          console.error("[square]", evt.source, evt.error);
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }),
    [routerAdapter, cart.items],
  );

  return (
    <main className="page-checkout">
      <CioCheckoutProvider<"square", SquareState, CartItem>
        provider="square"
        key={`square:${auth.user?.id ?? "anon"}`}
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
    </main>
  );
}

function Recs() {
  const flow = useCioCheckout<"square", SquareState>();
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
          onAdd={(p) =>
            cart.add({
              id: p.id,
              name: p.name,
              price: p.price,
              imageUrl: p.imageUrl,
            })
          }
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
  const flow = useCioCheckout<"square", SquareState>();
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
    },
    [flow],
  );

  const pickShipping = useCallback(
    (r: ShippingRate) => {
      setRate(r);
      flow.setIntegratorState((prev) => ({ ...prev, shippingId: r.id }));
    },
    [flow],
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
  const flow = useCioCheckout<"square", SquareState>();
  const cart = useCart();
  const subtotal = cart.items.reduce((n, i) => n + i.price * i.quantity, 0);
  const amountCents = Math.round(subtotal * 1.08 * 100);

  return (
    <CioCheckoutStep id="payment">
      <section className="step">
        <div className="step-header">
          <h2>Payment</h2>
        </div>
        <SquarePaymentStep amountCents={amountCents} />
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
  const flow = useCioCheckout<"square", SquareState>();
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
          return {
            success: true,
            message: "Payment captured via Square Sandbox.",
          };
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
                <h3>Thanks — your order is confirmed</h3>
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
