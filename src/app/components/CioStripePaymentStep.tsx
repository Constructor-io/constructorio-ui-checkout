import { useCallback, useEffect, useMemo, useRef } from 'react';

import {
  CheckoutElementsProvider,
  CheckoutFormProvider,
} from '@stripe/react-stripe-js/checkout';

import CheckoutForm from '@src/app/components/CheckoutForm';
import CheckoutFormElements from '@src/app/components/CheckoutFormElements';
import CheckoutLoader from '@src/app/components/CheckoutLoader';
import { useCioCheckout } from '@src/app/hooks/useCioCheckout';
import { useCioCheckoutSession } from '@src/app/hooks/useCioCheckoutSession';
import stripeLoader from '@src/providers/stripe/stripeLoader';
import type {
  CheckoutComponentOverrides,
  CheckoutStripeOptions,
  CheckoutStripeRedirectBehavior,
  CheckoutStripeUiMode,
  Translations,
} from '@src/types';
import { t } from '@src/utils';

import './CioStripePaymentStep.css';

export interface CioStripePaymentStepProps extends CheckoutStripeOptions {
  uiMode?: CheckoutStripeUiMode;
  redirectBehavior?: CheckoutStripeRedirectBehavior;
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
  const flow = useCioCheckout<'stripe'>();
  const receivedProvider: string = flow.provider;
  if (receivedProvider !== 'stripe') {
    throw new Error(
      `<CioStripePaymentStep> must be rendered inside <CioCheckoutProvider provider="stripe">, received provider="${receivedProvider}".`
    );
  }
  const { session, sessionStatus, missingSession, retry } =
    useCioCheckoutSession<'stripe'>();
  const mountedRef = useRef(true);
  const missingReportedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    return flow.on((event) => {
      if (event.type !== 'error') return;
      if (
        event.source === 'session.create' ||
        event.source === 'payment.confirm'
      ) {
        onError?.(event.error);
      }
    });
  }, [flow, onError]);

  useEffect(() => {
    if (!missingSession || missingReportedRef.current) return;
    missingReportedRef.current = true;
    flow.emitError(
      'session.create',
      new Error(
        '<CioStripePaymentStep> needs a session, but the flow has no onCreateSession handler.'
      )
    );
  }, [flow, missingSession]);

  const handleComplete = useCallback(() => {
    if (!mountedRef.current) return;
    void flow.next();
  }, [flow]);

  const handleExpired = useCallback(() => {
    flow.markExpired();
  }, [flow]);

  const handleConfirmError = useCallback(
    (error: Error) => {
      flow.emitError('payment.confirm', error);
    },
    [flow]
  );

  const handleRetrySession = useCallback(() => {
    void retry();
  }, [retry]);

  const stripePromise = useMemo(() => {
    if (!session) return null;
    return stripeLoader.getStripe(session.publishableKey, uiMode);
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

  if (missingSession) {
    return (
      <div className="cio-checkout-session-error" role="alert">
        <p>{t(translations, 'CioCheckout.session.missingLabel')}</p>
      </div>
    );
  }

  if (sessionStatus === 'error') {
    return (
      <div className="cio-checkout-session-error" role="alert">
        <p>{t(translations, 'CioCheckout.session.errorLabel')}</p>
        <button type="button" onClick={handleRetrySession}>
          {t(translations, 'CioCheckout.session.retryLabel')}
        </button>
      </div>
    );
  }

  if (!session || !stripePromise || !providerOptions) {
    return (
      <CheckoutLoader
        translations={translations}
        componentOverrides={componentOverrides}
      />
    );
  }

  const Provider =
    uiMode === 'form' ? CheckoutFormProvider : CheckoutElementsProvider;

  return (
    <Provider stripe={stripePromise} options={providerOptions}>
      {uiMode === 'form' ? (
        <CheckoutForm
          onComplete={handleComplete}
          onError={handleConfirmError}
          onSessionExpired={handleExpired}
          layout={layout}
          redirectBehavior={redirectBehavior}
        />
      ) : (
        <CheckoutFormElements
          onComplete={handleComplete}
          onError={handleConfirmError}
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
