import { useCallback, useEffect, useRef, useState } from 'react';

import { useCheckoutFlow } from '@src/app/hooks/useCheckoutFlow';

export interface FulfillmentResult {
  success: boolean;
  message?: string;
}

export type FulfillmentStatus = 'idle' | 'pending' | 'fulfilled' | 'failed';

export interface FulfillmentRenderProps {
  status: FulfillmentStatus;
  result: FulfillmentResult | null;
  retry: () => void;
  advance: () => void;
}

export interface CheckoutFulfillmentStepProps {
  onFulfill: () => Promise<FulfillmentResult>;
  onFulfillComplete?: (result: FulfillmentResult) => void;
  advanceOnSuccess?: boolean;
  render?: (props: FulfillmentRenderProps) => React.ReactNode;
}

// Verifies the order post-payment. Runs onFulfill once on mount, exposes
// status + retry via render prop. Advances the flow on success by default.
// Retry re-runs onFulfill without changing session state.
export function CheckoutFulfillmentStep({
  onFulfill,
  onFulfillComplete,
  advanceOnSuccess = true,
  render,
}: CheckoutFulfillmentStepProps) {
  const flow = useCheckoutFlow();
  const [status, setStatus] = useState<FulfillmentStatus>('idle');
  const [result, setResult] = useState<FulfillmentResult | null>(null);
  const inFlightRef = useRef(false);

  const run = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setStatus('pending');
    try {
      const outcome = await onFulfill();
      setResult(outcome);
      setStatus(outcome.success ? 'fulfilled' : 'failed');
      onFulfillComplete?.(outcome);
      if (outcome.success && advanceOnSuccess) {
        void flow.next();
      }
    } catch (reason) {
      const outcome: FulfillmentResult = {
        success: false,
        message:
          reason instanceof Error ? reason.message : 'Fulfillment failed',
      };
      setResult(outcome);
      setStatus('failed');
      onFulfillComplete?.(outcome);
    } finally {
      inFlightRef.current = false;
    }
  }, [onFulfill, onFulfillComplete, advanceOnSuccess, flow]);

  useEffect(() => {
    if (status === 'idle') void run();
  }, [run, status]);

  const retry = useCallback(() => {
    setStatus('idle');
    setResult(null);
  }, []);

  const advance = useCallback(() => {
    void flow.next();
  }, [flow]);

  if (render) {
    return <>{render({ status, result, retry, advance })}</>;
  }

  if (status === 'pending') {
    return (
      <div className="cio-checkout-fulfillment cio-checkout-fulfillment--pending">
        Verifying your order...
      </div>
    );
  }

  if (status === 'fulfilled') {
    return (
      <div className="cio-checkout-fulfillment cio-checkout-fulfillment--success">
        {result?.message ?? 'Order confirmed'}
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="cio-checkout-fulfillment cio-checkout-fulfillment--failed">
        <p>{result?.message ?? 'Verification failed'}</p>
        <button type="button" onClick={retry}>
          Retry
        </button>
      </div>
    );
  }

  return null;
}

export default CheckoutFulfillmentStep;
