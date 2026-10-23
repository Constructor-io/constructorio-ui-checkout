import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  CioCheckoutProvider,
  CioCheckoutStep,
  CioFulfillmentStep,
  CioStripePaymentStep,
  createSessionStorageAdapter,
  useCioCheckout,
} from "@constructor-io/constructorio-ui-checkout";

import { Button } from "@constructor-io/constructorio-ui-components";

import CodePanel from "../../components/CodePanel";
import {
  AddressPicker,
  OrderSummary,
  ShippingPicker,
} from "../../components/checkoutParts";
import { useAuth } from "../../contexts/AuthContext";
import { useCart, type CartItem } from "../../contexts/CartContext";
import { api, Address, ShippingRate } from "../../lib/api";
import { BASE_PATH } from "./OnePageApp";
import { ONEPAGE_SNIPPET } from "./snippet";

interface OnePageState {
  addressId?: string;
  shippingId?: string;
}

export default function OnePageCheckout() {
  const cart = useCart();
  const auth = useAuth();

  const config = {
    steps: [
      { id: "checkout", guard: (s) => s.cartSnapshot.length > 0 },
      { id: "complete" },
    ],
    cart: cart.items,
    cartItemFields: {
      id: "id",
      quantity: "quantity",
      unitAmount: "price",
    } as const,
    initialState: {} as OnePageState,
    autoStart: true,
    storage: createSessionStorageAdapter<CartItem>(),
    storageAutoResume: true,
    storageKey: "cio-checkout::demo:one-page",
    onCreateSession: async (state) => {
      const meta = state.metadata as OnePageState;
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
      const meta = (patch.metadata || {}) as OnePageState;
      const items = (patch.items ?? cart.items).map((i) => ({
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
        console.error("[one-page]", evt.source, evt.error);
    },
  };

  return (
    <main className="page-checkout">
      <CioCheckoutProvider<"stripe", OnePageState, CartItem>
        provider="stripe"
        key={`one-page:${auth.user?.id ?? "anon"}`}
        {...config}
      >
        <OnePageBody />
      </CioCheckoutProvider>
      <CodePanel title="Wiring the 'one-page' flow" code={ONEPAGE_SNIPPET} />
    </main>
  );
}

function OnePageBody() {
  const flow = useCioCheckout<"stripe", OnePageState, CartItem>();
  const cart = useCart();
  const navigate = useNavigate();
  const meta = flow.getIntegratorState();
  const [rate, setRate] = useState<ShippingRate | undefined>();
  const [orderResult, setOrderResult] = useState<{ message?: string } | null>(
    null,
  );
  const clearedRef = useRef(false);

  useEffect(() => {
    flow.setCart(cart.items);
  }, [cart.items, flow]);

  const canMountStripe =
    !!meta.addressId && !!meta.shippingId && cart.items.length > 0;

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
        });
      }
    },
    [flow],
  );

  const pickShipping = useCallback(
    (r: ShippingRate) => {
      setRate(r);
      flow.setIntegratorState((prev) => ({ ...prev, shippingId: r.id }));
      if (flow.getSession()) {
        void flow.updateSession({
          reason: "shipping",
          metadata: { addressId: meta.addressId, shippingId: r.id },
        });
      }
    },
    [flow, meta.addressId],
  );

  return (
    <>
      <CioCheckoutStep id="checkout">
        <section className="step">
          <div className="step-header">
            <h2>Checkout</h2>
          </div>
          <div className="two-col">
            <div>
              <h3>Cart ({cart.count})</h3>
              <OrderSummary shippingRate={rate ?? null} />
            </div>
            <div>
              <h3>Ship to</h3>
              <AddressPicker value={meta.addressId} onChange={pickAddress} />
              <h3 style={{ marginTop: 16 }}>Delivery</h3>
              <ShippingPicker
                addressId={meta.addressId}
                value={meta.shippingId}
                onChange={pickShipping}
              />
            </div>
          </div>

          <div className="onepage-payment">
            <h3>Payment</h3>
            {canMountStripe ? (
              <CioStripePaymentStep uiMode="elements" />
            ) : (
              <div className="muted small">
                Fill cart and pick address + shipping to reveal payment.
              </div>
            )}
          </div>
        </section>
      </CioCheckoutStep>

      {orderResult ? (
        <section className="step">
          <div className="step-header">
            <h2>Order confirmed</h2>
          </div>
          <div className="success-block">
            <h3>Thanks — order confirmed 🎉</h3>
            <p>{orderResult.message}</p>
            <Button
              type="button"
              variant="default"
              onClick={() => navigate(BASE_PATH)}
            >
              Done
            </Button>
          </div>
        </section>
      ) : (
        <CioCheckoutStep id="complete">
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
                  setOrderResult({ message: result.message });
                  cart.clear();
                  await flow.clearState();
                }
              }}
              render={({ status, result }) => {
                if (status === "pending")
                  return <div className="muted">Verifying…</div>;
                if (status === "fulfilled")
                  return <div className="muted">Finalizing…</div>;
                return <div className="error-block">{result?.message}</div>;
              }}
            />
          </section>
        </CioCheckoutStep>
      )}
    </>
  );
}
