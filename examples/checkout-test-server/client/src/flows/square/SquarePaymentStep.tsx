import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@constructor-io/constructorio-ui-components";

import {
  useCioCheckout,
  useCioCheckoutSession,
} from "@constructor-io/constructorio-ui-checkout";

const SDK_URL = "https://sandbox.web.squarecdn.com/v1/square.js";

declare global {
  interface Window {
    Square?: {
      payments: (applicationId: string, locationId: string) => SquarePayments;
    };
  }
}

interface SquarePayments {
  card: () => Promise<SquareCard>;
}

interface SquareCard {
  attach: (selector: string | HTMLElement) => Promise<void>;
  tokenize: () => Promise<{
    status: string;
    token?: string;
    errors?: Array<{ message: string }>;
  }>;
  destroy: () => Promise<void>;
}

let sdkPromise: Promise<void> | null = null;
function loadSquareSdk(): Promise<void> {
  if (typeof window === "undefined")
    return Promise.reject(new Error("window unavailable"));
  if (window.Square) return Promise.resolve();
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SDK_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Failed to load Square Web Payments SDK"));
    document.head.appendChild(script);
  });
  return sdkPromise;
}

export interface SquarePaymentStepProps {
  amountCents: number;
  onError?: (err: Error) => void;
}

export default function SquarePaymentStep({
  amountCents,
  onError,
}: SquarePaymentStepProps) {
  const flow = useCioCheckout<"square">();
  const { session, sessionStatus, retry } = useCioCheckoutSession<"square">();
  const cardHostRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<SquareCard | null>(null);
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!session || !cardHostRef.current) return;

    void (async () => {
      try {
        await loadSquareSdk();
        if (cancelled || !window.Square || !cardHostRef.current) return;
        const payments = window.Square.payments(
          session.applicationId,
          session.locationId,
        );
        const card = await payments.card();
        if (cancelled || !cardHostRef.current) {
          await card.destroy().catch(() => {});
          return;
        }
        await card.attach(cardHostRef.current);
        cardRef.current = card;
        setReady(true);
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e.message);
        onError?.(e);
      }
    })();

    return () => {
      cancelled = true;
      const c = cardRef.current;
      cardRef.current = null;
      if (c) void c.destroy().catch(() => {});
      setReady(false);
    };
  }, [session, onError]);

  const pay = useCallback(async () => {
    if (!cardRef.current || !session || submitting) return;
    setSubmitting(true);
    setError(null);
    // Blocks back() and goTo() while the charge runs.
    flow.setPaymentInProgress(true);
    try {
      const result = await cardRef.current.tokenize();
      if (result.status !== "OK" || !result.token) {
        const msg = result.errors?.[0]?.message ?? "Card tokenization failed";
        throw new Error(msg);
      }
      const res = await fetch("/api/square/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: result.token,
          sessionId: session.sessionId,
          amountCents,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.success) {
        throw new Error(body.error || `Payment failed (${res.status})`);
      }
      flow.setPaymentInProgress(false);
      void flow.next();
    } catch (err) {
      flow.setPaymentInProgress(false);
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e.message);
      onError?.(e);
    } finally {
      setSubmitting(false);
    }
  }, [amountCents, flow, onError, session, submitting]);

  if (sessionStatus === "error") {
    return (
      <div className="error-block">
        <p>Failed to prepare Square session.</p>
        <Button type="button" variant="outline" onClick={() => void retry()}>
          Retry
        </Button>
      </div>
    );
  }

  if (!session) {
    return <div className="muted">Preparing Square payment form…</div>;
  }

  const amountLabel = (amountCents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });

  return (
    <div className="square-payment">
      <div ref={cardHostRef} className="square-card-host" />
      {error && <div className="error-block">{error}</div>}
      <Button
        type="button"
        variant="default"
        disabled={!ready || submitting}
        onClick={pay}
        style={{ marginTop: 12 }}
      >
        {submitting ? "Processing…" : `Pay ${amountLabel}`}
      </Button>
    </div>
  );
}
