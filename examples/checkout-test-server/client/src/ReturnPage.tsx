import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

interface CheckoutSessionStatus {
  status: string;
  paymentStatus: string;
  customerEmail: string;
  amountTotal: number;
  currency: string;
}

export default function ReturnPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [status, setStatus] = useState<CheckoutSessionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    fetch(`/api/checkout-session/${sessionId}/status`)
      .then((res) => res.json())
      .then(setStatus)
      .catch((err) => setError(err.message));
  }, [sessionId]);

  if (!sessionId) {
    return (
      <div className="return-page">
        <h1>No session ID</h1>
        <p>This page is the return URL after Stripe checkout completes.</p>
        <a href="/">Back to checkout</a>
      </div>
    );
  }

  if (error) {
    return (
      <div className="return-page">
        <h1>Error</h1>
        <p>{error}</p>
        <a href="/">Back to checkout</a>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="return-page">
        <h1>Loading...</h1>
      </div>
    );
  }

  return (
    <div className="return-page">
      <h1>
        {status.paymentStatus === "paid"
          ? "Payment Successful!"
          : "Payment Status"}
      </h1>
      <dl className="status-details">
        <dt>Session ID</dt>
        <dd>
          <code>{sessionId}</code>
        </dd>
        <dt>Status</dt>
        <dd>{status.status}</dd>
        <dt>Payment Status</dt>
        <dd>{status.paymentStatus}</dd>
        <dt>Email</dt>
        <dd>{status.customerEmail || "N/A"}</dd>
        <dt>Amount</dt>
        <dd>
          {((status.amountTotal || 0) / 100).toFixed(2)}{" "}
          {(status.currency || "usd").toUpperCase()}
        </dd>
      </dl>
      <a href="/">Back to checkout</a>
    </div>
  );
}
