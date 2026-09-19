import { useCallback, useEffect, useMemo, useRef } from 'react';

import {
  CheckoutElementsProvider,
  CheckoutFormProvider,
} from '@stripe/react-stripe-js/checkout';

import CheckoutForm from '@src/app/components/CheckoutForm';
import CheckoutFormElements from '@src/app/components/CheckoutFormElements';
import { useCioCheckout } from '@src/app/hooks/useCioCheckout';
import checkoutManager from '@src/manager/CheckoutManager';
import type {
  CheckoutComponentOverrides,
  CheckoutRedirectBehavior,
  CheckoutStripeOptions,
  CheckoutUiMode,
  Translations,
} from '@src/types';

import './CioStripePaymentStep.css';

export interface CioStripePaymentStepProps extends CheckoutStripeOptions {
  uiMode?: CheckoutUiMode;
  redirectBehavior?: CheckoutRedirectBehavior;
  translations?: Translations;
  componentOverrides?: CheckoutComponentOverrides;
  onError?: (error: Error) => void;
}

export function CioStripePaymentStep({
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
}: CioStripePaymentStepProps) {
  const flow = useCioCheckout<'stripe', unknown>();
  const receivedProvider: string = flow.provider;
  if (receivedProvider !== 'stripe') {
    throw new Error(
      `<CioStripePaymentStep> must be rendered inside <CioCheckoutProvider provider="stripe">, received provider="${receivedProvider}".`
    );
  }
  const session = flow.getSession();
  const sessionStatus = flow.state.sessionStatus;
  const mountedRef = useRef(true);
  const notifiedErrorRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (session) return;
    if (sessionStatus === 'idle') {
      void flow.createSession();
    } else if (sessionStatus === 'expired') {
      void flow.recreate();
    }
  }, [flow, session, sessionStatus]);

  useEffect(() => {
    if (sessionStatus === 'error' && !notifiedErrorRef.current) {
      notifiedErrorRef.current = true;
      onError?.(new Error('Failed to create checkout session'));
    }
    if (sessionStatus === 'idle' || sessionStatus === 'active') {
      notifiedErrorRef.current = false;
    }
  }, [sessionStatus, onError]);

  const handleComplete = useCallback(() => {
    if (!mountedRef.current) return;
    void flow.next();
  }, [flow]);

  const handleExpired = useCallback(() => {
    flow.markExpired();
  }, [flow]);

  const handleRetrySession = useCallback(() => {
    void flow.recreate();
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

  if (sessionStatus === 'error') {
    return (
      <div className="cio-checkout-session-error" role="alert">
        <p>Failed to prepare checkout. Please try again.</p>
        <button type="button" onClick={handleRetrySession}>
          Retry
        </button>
      </div>
    );
  }

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

export default CioStripePaymentStep;
