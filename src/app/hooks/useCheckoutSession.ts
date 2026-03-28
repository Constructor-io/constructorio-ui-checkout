import { useCallback, useState } from 'react';

import type {
  CheckoutItem,
  CheckoutSessionResponse,
  CheckoutSourceConfig,
  CioCheckoutCallbacks,
} from '@src/types';

interface UseCheckoutSessionReturn {
  isOpen: boolean;
  isLoading: boolean;
  clientSecret: string | null;
  publishableKey: string | null;
  error: Error | null;
  openCheckout: () => void;
  closeCheckout: () => void;
  handleComplete: () => void;
}

function normalizeItems(items: CheckoutItem | CheckoutItem[]): CheckoutItem[] {
  return Array.isArray(items) ? items : [items];
}

async function fetchSessionFromBackend(
  sessionUrl: string,
  items: CheckoutItem[],
  headers?: Record<string, string>
): Promise<CheckoutSessionResponse> {
  const response = await fetch(sessionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({ items }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Checkout session creation failed (${String(response.status)}): ${body}`);
  }

  const data: unknown = await response.json();
  const session = data as CheckoutSessionResponse;

  if (!session.clientSecret || !session.publishableKey) {
    throw new Error('Invalid session response: missing clientSecret or publishableKey');
  }

  return session;
}

export default function useCheckoutSession(
  config: CheckoutSourceConfig,
  callbacks?: CioCheckoutCallbacks
): UseCheckoutSessionReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const openCheckout = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let session: CheckoutSessionResponse;

      if (config.source === 'session') {
        session = await config.fetchSession();
      } else if (config.source === 'function') {
        const resolved = await config.getItems();
        const items = normalizeItems(resolved);
        session = await fetchSessionFromBackend(
          config.sessionUrl,
          items,
          config.sessionHeaders
        );
      } else {
        // source === 'items'
        const items = normalizeItems(config.items);
        session = await fetchSessionFromBackend(
          config.sessionUrl,
          items,
          config.sessionHeaders
        );
      }

      setClientSecret(session.clientSecret);
      setPublishableKey(session.publishableKey);
      setIsOpen(true);
    } catch (err) {
      const wrappedError = err instanceof Error ? err : new Error(String(err));
      setError(wrappedError);
      callbacks?.onError?.(wrappedError);
    } finally {
      setIsLoading(false);
    }
  }, [config, callbacks]);

  const closeCheckout = useCallback(() => {
    setIsOpen(false);
    setClientSecret(null);
    setPublishableKey(null);
    callbacks?.onClose?.();
  }, [callbacks]);

  const handleComplete = useCallback(() => {
    setIsOpen(false);
    setClientSecret(null);
    setPublishableKey(null);
    callbacks?.onComplete?.();
  }, [callbacks]);

  return {
    isOpen,
    isLoading,
    clientSecret,
    publishableKey,
    error,
    openCheckout,
    closeCheckout,
    handleComplete,
  };
}
