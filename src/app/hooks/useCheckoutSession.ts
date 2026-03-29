import { useCallback, useMemo, useRef, useState } from 'react';

import checkoutRegistry from '@src/registry/CheckoutRegistry';
import type {
  CheckoutCompleteEvent,
  CheckoutItem,
  CheckoutSession,
  CheckoutSessionResponse,
  CioCheckoutCallbacks,
  CioCheckoutProps,
  FulfillmentResult,
  FulfillmentStatus,
} from '@src/types';

export interface UseCheckoutSessionReturn {
  isOpen: boolean;
  isLoading: boolean;
  session: CheckoutSessionResponse | null;
  error: Error | null;
  fulfillmentStatus: FulfillmentStatus;
  fulfillmentResult: FulfillmentResult | null;
  openCheckout: () => void;
  closeCheckout: () => void;
  handleComplete: () => void;
  retryFulfillment: () => void;
  reset: () => void;
}

/**
 * Extract the Stripe Checkout Session ID from a clientSecret.
 * Format: `cs_test_<sessionId>_secret_<secret>` or `cs_live_<sessionId>_secret_<secret>`
 */
function extractSessionId(clientSecret: string): string {
  const match = clientSecret.match(/^(cs_(?:test|live)_[A-Za-z0-9]+)/);
  return match ? match[1] : clientSecret;
}

function normalizeItems(items: CheckoutItem | CheckoutItem[]): CheckoutItem[] {
  return Array.isArray(items) ? items : [items];
}

async function resolveItems(
  items: CioCheckoutProps['items']
): Promise<CheckoutItem[] | undefined> {
  if (!items) return undefined;
  if (typeof items === 'function') {
    const result = await items();
    return normalizeItems(result);
  }
  return normalizeItems(items);
}

async function resolveSession(
  session: CheckoutSession
): Promise<CheckoutSessionResponse> {
  if (typeof session === 'function') {
    return session();
  }
  return session;
}

export default function useCheckoutSession(
  props: CioCheckoutProps,
  callbacks?: CioCheckoutCallbacks
): UseCheckoutSessionReturn {
  const { items, triggerState, triggerWhen, session: propsSession } = props;

  const registrySession = checkoutRegistry.getSession();

  const session = useMemo<CheckoutSession>(
    () => propsSession ?? registrySession!,
    [propsSession, registrySession]
  );

  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionResponse, setSessionResponse] =
    useState<CheckoutSessionResponse | null>(null);
  const [resolvedItems, setResolvedItems] = useState<
    CheckoutItem[] | undefined
  >(undefined);
  const [error, setError] = useState<Error | null>(null);
  const [fulfillmentStatus, setFulfillmentStatus] =
    useState<FulfillmentStatus>('idle');
  const [fulfillmentResult, setFulfillmentResult] =
    useState<FulfillmentResult | null>(null);

  // Store the last complete event for retry
  const lastCompleteEventRef = useRef<CheckoutCompleteEvent | null>(null);

  const runFulfillment = useCallback(
    (completeEvent: CheckoutCompleteEvent) => {
      if (!callbacks?.onFulfill) return;

      setFulfillmentStatus('pending');
      setFulfillmentResult(null);

      callbacks
        .onFulfill(completeEvent)
        .then((result) => {
          setFulfillmentStatus(result.success ? 'fulfilled' : 'failed');
          setFulfillmentResult(result);
          callbacks.onFulfillComplete?.({ ...completeEvent, result });
        })
        .catch((err: unknown) => {
          const message =
            err instanceof Error ? err.message : 'Fulfillment failed';
          const failResult: FulfillmentResult = { success: false, message };
          setFulfillmentStatus('failed');
          setFulfillmentResult(failResult);
          callbacks.onFulfillComplete?.({
            ...completeEvent,
            result: failResult,
          });
        });
    },
    [callbacks]
  );

  const openCheckout = useCallback(() => {
    if (triggerWhen && !triggerWhen(triggerState ?? {})) {
      return;
    }

    setIsLoading(true);
    setError(null);

    Promise.all([resolveSession(session), resolveItems(items)])
      .then(([result, items]) => {
        setSessionResponse(result);
        setResolvedItems(items);
        setIsOpen(true);
      })
      .catch((err: unknown) => {
        const wrapped = err instanceof Error ? err : new Error(String(err));
        setError(wrapped);
        callbacks?.onError?.(wrapped);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [session, items, triggerWhen, triggerState, callbacks]);

  const closeCheckout = useCallback(() => {
    setIsOpen(false);
    setSessionResponse(null);
    setResolvedItems(undefined);
    callbacks?.onClose?.();
  }, [callbacks]);

  const handleComplete = useCallback(() => {
    if (sessionResponse) {
      const completeEvent: CheckoutCompleteEvent = {
        sessionId: extractSessionId(sessionResponse.clientSecret),
        items: resolvedItems,
      };

      callbacks?.onComplete?.(completeEvent);
      lastCompleteEventRef.current = completeEvent;

      // If onFulfill is provided, transition to fulfillment phase
      if (callbacks?.onFulfill) {
        setIsOpen(false);
        runFulfillment(completeEvent);
      } else {
        setIsOpen(false);
        setSessionResponse(null);
        setResolvedItems(undefined);
      }
    } else {
      setIsOpen(false);
      setSessionResponse(null);
      setResolvedItems(undefined);
    }
  }, [callbacks, resolvedItems, sessionResponse, runFulfillment]);

  const retryFulfillment = useCallback(() => {
    const event = lastCompleteEventRef.current;
    if (event && callbacks?.onFulfill) {
      runFulfillment(event);
    }
  }, [callbacks, runFulfillment]);

  const reset = useCallback(() => {
    setIsOpen(false);
    setIsLoading(false);
    setSessionResponse(null);
    setResolvedItems(undefined);
    setError(null);
    setFulfillmentStatus('idle');
    setFulfillmentResult(null);
    lastCompleteEventRef.current = null;
  }, []);

  return {
    isOpen,
    isLoading,
    session: sessionResponse,
    error,
    fulfillmentStatus,
    fulfillmentResult,
    openCheckout,
    closeCheckout,
    handleComplete,
    retryFulfillment,
    reset,
  };
}
