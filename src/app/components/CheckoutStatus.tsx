import { Button } from '@constructor-io/constructorio-ui-components';

import type { FulfillmentResult, FulfillmentStatus } from '@src/types';

function CheckIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="24" fill="#dcfce7" />
      <path
        d="M14 24.5L21 31.5L34 18.5"
        stroke="#16a34a"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="24" fill="#fef2f2" />
      <path
        d="M17 17L31 31M31 17L17 31"
        stroke="#dc2626"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

interface CheckoutStatusProps {
  fulfillmentStatus: FulfillmentStatus;
  fulfillmentResult: FulfillmentResult | null;
  onRetry: () => void;
  onDismiss: () => void;
}

export default function CheckoutStatus({
  fulfillmentStatus,
  fulfillmentResult,
  onRetry,
  onDismiss,
}: CheckoutStatusProps) {
  if (fulfillmentStatus === 'idle') return null;

  return (
    <div className="cio-checkout-status" role="status">
      {fulfillmentStatus === 'pending' && (
        <div className="cio-checkout-status__pending">
          <span className="cio-checkout-status__spinner" aria-hidden="true" />
          <p className="cio-checkout-status__message">
            Verifying your order...
          </p>
        </div>
      )}

      {fulfillmentStatus === 'fulfilled' && (
        <div className="cio-checkout-status__fulfilled">
          <CheckIcon />
          <h3 className="cio-checkout-status__title">Order Confirmed</h3>
          {fulfillmentResult?.message && (
            <p className="cio-checkout-status__message">
              {fulfillmentResult.message}
            </p>
          )}
          <Button className="cio-checkout-status__dismiss" onClick={onDismiss}>
            Done
          </Button>
        </div>
      )}

      {fulfillmentStatus === 'failed' && (
        <div className="cio-checkout-status__failed">
          <ErrorIcon />
          <h3 className="cio-checkout-status__title">Verification Failed</h3>
          {fulfillmentResult?.message && (
            <p className="cio-checkout-status__message">
              {fulfillmentResult.message}
            </p>
          )}
          <p className="cio-checkout-status__hint">
            Your payment was processed. Please contact support if the issue
            persists.
          </p>
          <div className="cio-checkout-status__actions">
            <Button onClick={onRetry}>Retry</Button>
            <Button
              variant="outline"
              className="cio-checkout-status__dismiss"
              onClick={onDismiss}
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
