import { forwardRef, useCallback, useImperativeHandle, useMemo } from 'react';

import {
  CheckoutElementsProvider,
  CheckoutFormProvider,
} from '@stripe/react-stripe-js/checkout';

import checkoutManager from '@src/manager/CheckoutManager';
import type { CioCheckoutHandle, CioCheckoutProps } from '@src/types';

import CheckoutInline from './components/CheckoutInline';
import CheckoutOverlay from './components/CheckoutOverlay';
import CheckoutStatus from './components/CheckoutStatus';
import CheckoutTrigger from './components/CheckoutTrigger';
import useCheckoutSession from './hooks/useCheckoutSession';

import '../styles.css';
import './index.css';

const CioCheckout = forwardRef<CioCheckoutHandle, CioCheckoutProps>(
  function CioCheckout(props, ref) {
    const {
      callbacks,
      trigger,
      triggerLabel,
      triggerWhen,
      triggerState,
      displayMode = 'modal',
      uiMode = 'form',
      redirectBehavior,
      appearance,
      loader,
      fonts,
      savedPaymentMethod,
      defaultValues,
      adaptivePricing,
      syncAddressCheckbox,
      translations,
      componentOverrides,
      layout,
    } = props;

    const {
      isOpen,
      isLoading,
      session,
      error,
      fulfillmentStatus,
      fulfillmentResult,
      openCheckout,
      closeCheckout,
      handleComplete,
      retryFulfillment,
      reset,
    } = useCheckoutSession(props, callbacks);

    useImperativeHandle(
      ref,
      () => ({ open: openCheckout, close: closeCheckout, reset }),
      [openCheckout, closeCheckout, reset]
    );

    const handleSessionExpired = useCallback(() => {
      closeCheckout();
      callbacks?.onSessionExpired?.();
    }, [closeCheckout, callbacks]);

    const showTrigger = triggerWhen ? triggerWhen(triggerState ?? {}) : true;
    const isInline = displayMode === 'inline';
    const isFulfilling = fulfillmentStatus !== 'idle';

    const stripePromise = useMemo(
      () =>
        session
          ? checkoutManager.getStripe(session.publishableKey, uiMode)
          : null,
      [session, uiMode]
    );

    const providerOptions = useMemo(() => {
      if (!session) return undefined;

      if (uiMode === 'form') {
        const opts = {
          clientSecret: session.clientSecret,
          appearance,
          loader,
          fonts,
          savedPaymentMethod,
          defaultValues,
        };
        return opts;
      }

      const opts = {
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
      return opts;
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

    const Provider =
      uiMode === 'form' ? CheckoutFormProvider : CheckoutElementsProvider;

    return (
      <div className="cio-checkout-root">
        {showTrigger && !(isInline && isOpen) && !isFulfilling && (
          <CheckoutTrigger
            onClick={openCheckout}
            isLoading={isLoading}
            label={triggerLabel}
            translations={translations}
          >
            {trigger}
          </CheckoutTrigger>
        )}

        {error && (
          <div className="cio-checkout-error" role="alert">
            {error.message}
          </div>
        )}

        {isOpen && stripePromise && providerOptions && (
          <Provider stripe={stripePromise} options={providerOptions}>
            {isInline ? (
              <CheckoutInline
                onCancel={closeCheckout}
                onComplete={handleComplete}
                onError={callbacks?.onError}
                onSessionExpired={handleSessionExpired}
                uiMode={uiMode}
                layout={layout}
                redirectBehavior={redirectBehavior}
                translations={translations}
                componentOverrides={componentOverrides}
              />
            ) : (
              <CheckoutOverlay
                isOpen={isOpen}
                onClose={closeCheckout}
                onComplete={handleComplete}
                onError={callbacks?.onError}
                onSessionExpired={handleSessionExpired}
                uiMode={uiMode}
                layout={layout}
                redirectBehavior={redirectBehavior}
                translations={translations}
                componentOverrides={componentOverrides}
              />
            )}
          </Provider>
        )}

        {isFulfilling && (
          <CheckoutStatus
            fulfillmentStatus={fulfillmentStatus}
            fulfillmentResult={fulfillmentResult}
            onRetry={retryFulfillment}
            onDismiss={reset}
            translations={translations}
            componentOverride={componentOverrides?.checkoutStatus}
          />
        )}
      </div>
    );
  }
);

CioCheckout.displayName = 'CioCheckout';

export default CioCheckout;
