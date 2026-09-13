import { useCallback, useEffect, useMemo } from 'react';

import {
  CheckoutElementsProvider,
  CheckoutFormProvider,
} from '@stripe/react-stripe-js/checkout';

import CheckoutForm from '@src/app/components/CheckoutForm';
import CheckoutFormElements from '@src/app/components/CheckoutFormElements';
import { useCheckoutFlow } from '@src/app/hooks/useCheckoutFlow';
import checkoutManager from '@src/manager/CheckoutManager';
import type {
  CheckoutLayout,
  CheckoutRedirectBehavior,
  CheckoutStripeOptions,
  CheckoutUiMode,
  CioCheckoutComponentOverrides,
  Translations,
} from '@src/types';

export interface CheckoutStripeStepProps extends CheckoutStripeOptions {
  uiMode?: CheckoutUiMode;
  redirectBehavior?: CheckoutRedirectBehavior;
  layout?: CheckoutLayout;
  translations?: Translations;
  componentOverrides?: CioCheckoutComponentOverrides;
  onError?: (error: Error) => void;
}

// Default renderer for the built-in `stripe` step. Auto-creates the session on
// first render, loads Stripe, wraps in the appropriate provider based on
// uiMode, and advances the flow on completion / marks it expired if Stripe
// reports session expiry.
export function CheckoutStripeStep({
  uiMode = 'form',
  redirectBehavior,
  layout,
  translations,
  componentOverrides,
  onError,
  appearance,
  loader,
  fonts,
  savedPaymentMethod,
  defaultValues,
  adaptivePricing,
  syncAddressCheckbox,
}: CheckoutStripeStepProps) {
  const flow = useCheckoutFlow();
  const session = flow.getSession();

  useEffect(() => {
    if (session) return;
    if (flow.state.sessionStatus !== 'idle') return;
    void flow.createSession();
  }, [flow, session]);

  const handleComplete = useCallback(() => {
    void flow.next();
  }, [flow]);

  const handleExpired = useCallback(() => {
    flow.markExpired();
  }, [flow]);

  const stripePromise = useMemo(() => {
    if (!session) return null;
    return checkoutManager.getStripe(session.publishableKey, uiMode);
  }, [session, uiMode]);

  const providerOptions = useMemo(() => {
    if (!session) return undefined;
    if (uiMode === 'form') {
      return {
        clientSecret: session.clientSecret,
        appearance,
        loader,
        fonts,
        savedPaymentMethod,
        defaultValues,
      };
    }
    return {
      clientSecret: session.clientSecret,
      elementsOptions: {
        appearance,
        loader,
        fonts,
        savedPaymentMethod,
        syncAddressCheckbox,
      },
      adaptivePricing,
      defaultValues,
    };
  }, [
    session,
    uiMode,
    appearance,
    loader,
    fonts,
    savedPaymentMethod,
    syncAddressCheckbox,
    adaptivePricing,
    defaultValues,
  ]);

  if (!session || !stripePromise || !providerOptions) {
    return null;
  }

  const Provider =
    uiMode === 'form' ? CheckoutFormProvider : CheckoutElementsProvider;

  return (
    <Provider stripe={stripePromise} options={providerOptions}>
      {uiMode === 'form' ? (
        <CheckoutForm
          onComplete={handleComplete}
          onError={onError}
          onSessionExpired={handleExpired}
          layout={layout}
          redirectBehavior={redirectBehavior}
        />
      ) : (
        <CheckoutFormElements
          onComplete={handleComplete}
          onError={onError}
          onSessionExpired={handleExpired}
          translations={translations}
          componentOverrides={componentOverrides}
          redirectBehavior={redirectBehavior}
        />
      )}
    </Provider>
  );
}

export default CheckoutStripeStep;
