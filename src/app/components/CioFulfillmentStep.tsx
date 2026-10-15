import { useCallback, useEffect, useRef, useState } from 'react';

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
  /**
   * When true, `retry()` first calls `flow.recreate()` and only re-runs
   * `onFulfill` once the new session is active. Use for providers that burn
   * the session on a failed charge (Fiserv). If recreating fails, the step
   * stays `failed` so the shopper can retry again. Defaults to `false`.
   */
  recreateSessionOnRetry?: boolean;
  /** Overrides for the step's built-in labels. */
  translations?: Translations;
}

/**
 * Runs `onFulfill` once on mount, exposes status and retry via a render prop,
 * and advances the flow on success by default. Retry re-invokes `onFulfill`
 * without touching session state, unless `recreateSessionOnRetry` is set.
 */
export function CioFulfillmentStep({
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
  const errorFallback = t(
    translations,
    'CioCheckout.fulfillment.errorFallbackLabel'
  );

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
        message: reason instanceof Error ? reason.message : errorFallback,
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
      // Consumer callback must not flip the outcome.
    }
    if (outcome.success && advanceOnSuccess) {
      void flow.next();
    }
  }, [onFulfill, onFulfillComplete, advanceOnSuccess, flow, errorFallback]);

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
        <p>
          {result?.message ??
            t(translations, 'CioCheckout.fulfillment.failedLabel')}
        </p>
        <button type="button" onClick={retry}>
          {t(translations, 'CioCheckout.fulfillment.retryLabel')}
        </button>
      </div>
    );
  }

  return null;
}

export default CioFulfillmentStep;
