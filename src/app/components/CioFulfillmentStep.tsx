import { useCallback, useEffect, useRef, useState } from 'react';

import { useCioPayment } from '@src/app/hooks/useCioPayment';

import './CioFulfillmentStep.css';

export interface CioFulfillmentResult {
  success: boolean;
  message?: string;
}

export type CioFulfillmentStatus = 'idle' | 'pending' | 'fulfilled' | 'failed';

export interface CioFulfillmentRenderProps {
  status: CioFulfillmentStatus;
  result: CioFulfillmentResult | null;
  retry: () => void;
  advance: () => void;
}

export interface CioFulfillmentStepProps {
  onFulfill: () => Promise<CioFulfillmentResult>;
  onFulfillComplete?: (result: CioFulfillmentResult) => void;
  advanceOnSuccess?: boolean;
  render?: (props: CioFulfillmentRenderProps) => React.ReactNode;
}

// Verifies the order post-payment. Runs onFulfill once on mount, exposes
// status + retry via render prop. Advances the flow on success by default.
// Retry re-runs onFulfill without changing session state.
export function CioFulfillmentStep({
  onFulfill,
  onFulfillComplete,
  advanceOnSuccess = true,
  render,
}: CioFulfillmentStepProps) {
  const flow = useCioPayment();
  const [status, setStatus] = useState<CioFulfillmentStatus>('idle');
  const [result, setResult] = useState<CioFulfillmentResult | null>(null);
  const inFlightRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const run = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setStatus('pending');
    let outcome: CioFulfillmentResult;
    try {
      outcome = await onFulfill();
    } catch (reason) {
      outcome = {
        success: false,
        message:
          reason instanceof Error ? reason.message : 'Fulfillment failed',
      };
    } finally {
      inFlightRef.current = false;
    }
    if (!mountedRef.current) return;
    setResult(outcome);
    setStatus(outcome.success ? 'fulfilled' : 'failed');
    try {
      onFulfillComplete?.(outcome);
    } catch {
      /* consumer callback error must not flip outcome */
    }
    if (outcome.success && advanceOnSuccess) {
      void flow.next();
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
      <div
        className="cio-checkout-fulfillment cio-checkout-fulfillment--pending"
        role="status"
        aria-live="polite"
      >
        Verifying your order...
      </div>
    );
  }

  if (status === 'fulfilled') {
    return (
      <div
        className="cio-checkout-fulfillment cio-checkout-fulfillment--success"
        role="status"
        aria-live="polite"
      >
        {result?.message ?? 'Order confirmed'}
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div
        className="cio-checkout-fulfillment cio-checkout-fulfillment--failed"
        role="alert"
      >
        <p>{result?.message ?? 'Verification failed'}</p>
        <button type="button" onClick={retry}>
          Retry
        </button>
      </div>
    );
  }

  return null;
}

export default CioFulfillmentStep;
