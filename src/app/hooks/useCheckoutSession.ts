import { useCallback, useMemo, useState } from 'react';

import checkoutRegistry from '@src/registry/CheckoutRegistry';
import type {
  CheckoutItem,
  CheckoutSession,
  CheckoutSessionResponse,
  CioCheckoutCallbacks,
  CioCheckoutProps,
} from '@src/types';

export interface UseCheckoutSessionReturn {
  isOpen: boolean;
  isLoading: boolean;
  session: CheckoutSessionResponse | null;
  error: Error | null;
  openCheckout: () => void;
  closeCheckout: () => void;
  handleComplete: () => void;
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
      callbacks?.onComplete?.({
        sessionId: extractSessionId(sessionResponse.clientSecret),
        items: resolvedItems,
      });
    }
    setIsOpen(false);
    setSessionResponse(null);
    setResolvedItems(undefined);
  }, [callbacks, resolvedItems, sessionResponse]);

  const reset = useCallback(() => {
    setIsOpen(false);
    setIsLoading(false);
    setSessionResponse(null);
    setResolvedItems(undefined);
    setError(null);
  }, []);

  return {
    isOpen,
    isLoading,
    session: sessionResponse,
    error,
    openCheckout,
    closeCheckout,
    handleComplete,
    reset,
  };
}
