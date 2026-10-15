import { useCallback, useEffect } from 'react';

import { useCioCheckout } from '@src/app/hooks/useCioCheckout';
import type { CheckoutSessionStatus } from '@src/core/types';
import type { BuiltInPaymentProvider, PaymentSessionFor } from '@src/types';

export interface UseCioCheckoutSessionReturn<
  TProvider extends string = BuiltInPaymentProvider,
> {
  /** The live payment session, or `null` while there is none. */
  session: PaymentSessionFor<TProvider> | null;
  sessionStatus: CheckoutSessionStatus;
  /**
   * True when the flow is `active` but holds no session object. This happens
   * when the flow has no `onCreateSession`. Steps that need a session should
   * treat it as a configuration error.
   */
  missingSession: boolean;
  /** Starts a fresh session. Same as `flow.recreate()`. */
  retry: () => Promise<PaymentSessionFor<TProvider> | null>;
}

/**
 * Bootstraps the payment session for a payment step: creates it when the
 * status is `idle` and recreates it when `expired`. Nothing else.
 *
 * @example
 * function MyPaymentStep() {
 *   const { session, sessionStatus, retry } = useCioCheckoutSession<'fiserv'>();
 *   if (sessionStatus === 'error') return <button onClick={retry}>Retry</button>;
 *   return session ? <FiservWidget session={session} /> : <Spinner />;
 * }
 */
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
