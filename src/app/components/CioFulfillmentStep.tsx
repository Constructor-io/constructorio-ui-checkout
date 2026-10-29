import { useCallback, useEffect, useRef, useState } from 'react';

import CheckoutRoot from '@src/app/components/CheckoutRoot';
import { useCioCheckout } from '@src/app/hooks/useCioCheckout';
import type { Translations } from '@src/types';
import { t } from '@src/utils';

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
  /** Retry starts a fresh session first. For providers that burn the session on a failed charge. */
  recreateSessionOnRetry?: boolean;
  translations?: Translations;
}

/**
 * Runs `onFulfill` once on mount, exposes status and retry via a render prop,
 * and advances the flow on success by default. `onFulfillComplete` runs after
 * the advance, so it is safe to clear state or navigate away in it. Retry
 * re-invokes `onFulfill` without touching session state.
 */
function CioFulfillmentStepInner({
  onFulfill,
  onFulfillComplete,
  advanceOnSuccess = true,
  render,
  recreateSessionOnRetry = false,
  translations,
}: CioFulfillmentStepProps) {
  const flow = useCioCheckout();
  const [status, setStatus] = useState<CioFulfillmentStatus>('idle');
  const [result, setResult] = useState<CioFulfillmentResult | null>(null);
  const inFlightRef = useRef(false);
  const recreatingRef = useRef(false);
  const mountedRef = useRef(true);
  const failedLabel = t(translations, 'CioCheckout.fulfillment.failedLabel');

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
        message: reason instanceof Error ? reason.message : failedLabel,
      };
    } finally {
      inFlightRef.current = false;
    }
    if (!mountedRef.current) return;
    setResult(outcome);
    setStatus(outcome.success ? 'fulfilled' : 'failed');
    try {
      // Advance first so the step is recorded and `flow.completed` fires
      // before the consumer can clear state or navigate away.
      if (outcome.success && advanceOnSuccess) await flow.next();
    } finally {
      try {
        onFulfillComplete?.(outcome);
      } catch {
        // Consumer callback must not flip the outcome.
      }
    }
  }, [onFulfill, onFulfillComplete, advanceOnSuccess, flow, failedLabel]);

  useEffect(() => {
    if (status === 'idle') void run();
  }, [run, status]);

  const retry = useCallback(() => {
    if (!recreateSessionOnRetry) {
      setStatus('idle');
      setResult(null);
      return;
    }
    if (recreatingRef.current) return;
    recreatingRef.current = true;
    void flow.recreate().finally(() => {
      recreatingRef.current = false;
      if (!mountedRef.current) return;
      if (flow.getState().sessionStatus !== 'active') return;
      setStatus('idle');
      setResult(null);
    });
  }, [flow, recreateSessionOnRetry]);

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
        {t(translations, 'CioCheckout.fulfillment.pendingLabel')}
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
        {result?.message ??
          t(translations, 'CioCheckout.fulfillment.successLabel')}
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div
        className="cio-checkout-fulfillment cio-checkout-fulfillment--failed"
        role="alert"
      >
        <p>{result?.message ?? failedLabel}</p>
        <button type="button" onClick={retry}>
          {t(translations, 'CioCheckout.fulfillment.retryLabel')}
        </button>
      </div>
    );
  }

  return null;
}

export function CioFulfillmentStep(props: CioFulfillmentStepProps) {
  return (
    <CheckoutRoot>
      <CioFulfillmentStepInner {...props} />
    </CheckoutRoot>
  );
}

export default CioFulfillmentStep;
