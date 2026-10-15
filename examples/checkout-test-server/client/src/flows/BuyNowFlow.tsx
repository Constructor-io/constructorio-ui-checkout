import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@constructor-io/constructorio-ui-components";

import {
  CioCheckoutProvider,
  CioCheckoutStep,
  CioFulfillmentStep,
  CioStripePaymentStep,
  createSessionStorageAdapter,
  useCioCheckout,
} from "@constructor-io/constructorio-ui-checkout";

import {
  AddressPicker,
  LoginForm,
  OrderSummary,
  ShippingPicker,
} from "../components/checkoutParts";
import { useAuth } from "../contexts/AuthContext";
import { api, Address, ShippingRate } from "../lib/api";
import { fmtUsd } from "../lib/constants";
import { useVariant } from "./variant";

interface BuyNowFlowProps {
  product: { id: string; name: string; price: number };
  onClose: () => void;
}

interface BuyNowState {
  userId?: string;
  userEmail?: string;
  addressId?: string;
  shippingId?: string;
}

export default function BuyNowFlow({ product, onClose }: BuyNowFlowProps) {
  const variant = useVariant();
  const auth = useAuth();
  const isGuest = variant === "guest";

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <h2>Buy Now — {product.name}</h2>
        <p className="muted small">{fmtUsd(product.price)} · 1 item</p>
        <CioCheckoutProvider<"stripe", BuyNowState>
          provider="stripe"
          key={`${variant}:${auth.user?.id ?? "anon"}:${product.id}`}
          steps={[
            { id: "login", optional: isGuest },
            { id: "address" },
            { id: "payment" },
            { id: "complete" },
          ]}
          initialState={{}}
          cart={[
            {
              id: product.id,
              name: product.name,
              unitAmount: product.price,
              quantity: 1,
            },
          ]}
          storage={createSessionStorageAdapter()}
          storageKey={`cio-checkout::buynow:${variant}:${product.id}`}
          storageAutoResume
          autoStart
          onCreateSession={async (state) => {
            const meta = state.metadata as BuyNowState;
            const res = await api.createCheckoutSession({
              items: [
                { name: product.name, amount: product.price, quantity: 1 },
              ],
              addressId: meta.addressId,
              shippingId: meta.shippingId,
            });
            return {
              clientSecret: res.clientSecret,
              publishableKey: res.publishableKey,
            };
          }}
          onUpdateSession={async (patch) => {
            const meta = (patch.metadata || {}) as BuyNowState;
            const res = await api.updateCheckoutSession({
              items: [
                { name: product.name, amount: product.price, quantity: 1 },
              ],
              addressId: meta.addressId,
              shippingId: meta.shippingId,
            });
            return {
              clientSecret: res.clientSecret,
              publishableKey: res.publishableKey,
            };
          }}
        >
          <BuyNowSteps product={product} onClose={onClose} isGuest={isGuest} />
        </CioCheckoutProvider>
      </div>
    </div>
  );
}

function BuyNowSteps({
  product,
  onClose,
  isGuest,
}: {
  product: BuyNowFlowProps["product"];
  onClose: () => void;
  isGuest: boolean;
}) {
  const flow = useCioCheckout<"stripe", BuyNowState>();
  const auth = useAuth();
  const meta = flow.getIntegratorState();
  const [rate, setRate] = useState<ShippingRate | undefined>();
  const [orderResult, setOrderResult] = useState<{ message?: string } | null>(
    null,
  );
  const autoAdvancedRef = useRef(false);
  const clearedRef = useRef(false);

  useEffect(() => {
    if (!auth.user) return;
    if (!flow.getIntegratorState().userId) {
      flow.setIntegratorState((prev) => ({
        ...prev,
        userId: auth.user!.id,
        userEmail: auth.user!.email,
      }));
    }
    if (autoAdvancedRef.current) return;
    if (flow.state.currentStepId !== "login") return;
    autoAdvancedRef.current = true;
    void flow.next();
  }, [auth.user, flow, flow.state.currentStepId]);

  const pickAddress = useCallback(
    (addr: Address) => {
      flow.setIntegratorState((prev) => ({
        ...prev,
        addressId: addr.id,
        shippingId: undefined,
      }));
      setRate(undefined);
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
      <CioCheckoutStep id="login">
        <div className="step compact">
          <h3>Sign in to continue</h3>
          {auth.user ? (
            <div className="muted">Signed in — continuing…</div>
          ) : (
            <>
              <LoginForm onSuccess={() => flow.next()} />
              {isGuest && (
                <div className="step-actions">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => flow.next({ skip: true })}
                  >
                    Continue as guest →
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </CioCheckoutStep>

      <CioCheckoutStep id="address">
        <div className="step compact">
          <h3>Ship to</h3>
          <AddressPicker value={meta.addressId} onChange={pickAddress} />
          <h3>Delivery</h3>
          <ShippingPicker
            addressId={meta.addressId}
            value={meta.shippingId}
            onChange={pickShipping}
          />
          <OrderSummary
            items={[
              {
                id: product.id,
                name: product.name,
                price: product.price,
                quantity: 1,
              },
            ]}
            shippingRate={rate ?? null}
          />
          <div className="step-actions">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="default"
              disabled={!meta.addressId || !meta.shippingId}
              onClick={() => flow.next()}
            >
              Continue to payment →
            </Button>
          </div>
        </div>
      </CioCheckoutStep>

      <CioCheckoutStep id="payment">
        <div className="step compact">
          <h3>Payment</h3>
          <CioStripePaymentStep uiMode="elements" />
          <div className="step-actions">
            <Button type="button" variant="outline" onClick={() => flow.back()}>
              ← Back
            </Button>
          </div>
        </div>
      </CioCheckoutStep>

      {orderResult ? (
        <div className="step compact">
          <div className="success-block">
            <h3>Order placed 🎉</h3>
            <p>{orderResult.message}</p>
            <Button type="button" variant="default" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      ) : (
        <CioCheckoutStep id="complete">
          <div className="step compact">
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
          </div>
        </CioCheckoutStep>
      )}
    </>
  );
}
