import { useCallback, useEffect } from 'react';

import { useCioCheckout } from '@src/app/hooks/useCioCheckout';
import type { CheckoutSessionStatus } from '@src/core/types';
import type { BuiltInPaymentProvider, PaymentSessionFor } from '@src/types';

export interface UseCioCheckoutSessionReturn<
  TProvider extends string = BuiltInPaymentProvider,
> {
  session: PaymentSessionFor<TProvider> | null;
  sessionStatus: CheckoutSessionStatus;
  /** True when the flow is `active` with no session, because it has no `onCreateSession`. */
  missingSession: boolean;
  retry: () => Promise<PaymentSessionFor<TProvider> | null>;
}

/** Creates the payment session when it is `idle` and recreates it when `expired`. */
export function useCioCheckoutSession<
  TProvider extends string = BuiltInPaymentProvider,
>(): UseCioCheckoutSessionReturn<TProvider> {
  const flow = useCioCheckout<TProvider>();
  const session = flow.getSession();
  const sessionStatus = flow.state.sessionStatus;

  useEffect(() => {
    if (session) return;
    if (sessionStatus === 'idle') {
      void flow.createSession();
    } else if (sessionStatus === 'expired') {
      void flow.recreate();
    }
  }, [flow, session, sessionStatus]);

  const retry = useCallback(() => flow.recreate(), [flow]);

  return {
    session,
    sessionStatus,
    missingSession: sessionStatus === 'active' && session === null,
    retry,
  };
}
