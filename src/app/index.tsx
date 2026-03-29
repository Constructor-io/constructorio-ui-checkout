import { forwardRef, useImperativeHandle, useMemo } from 'react';

import { EmbeddedCheckoutProvider } from '@stripe/react-stripe-js';

import checkoutManager from '@src/manager/CheckoutManager';
import type { CioCheckoutHandle, CioCheckoutProps } from '@src/types';

import CheckoutInline from './components/CheckoutInline';
import CheckoutOverlay from './components/CheckoutOverlay';
import CheckoutStatus from './components/CheckoutStatus';
import CheckoutTrigger from './components/CheckoutTrigger';
import useCheckoutSession from './hooks/useCheckoutSession';

import '@constructor-io/constructorio-ui-components/styles.css';
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
      translations,
      onShippingDetailsChange,
      onLineItemsChange,
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

    useImperativeHandle(ref, () => ({ reset }), [reset]);

    const showTrigger = triggerWhen ? triggerWhen(triggerState ?? {}) : true;
    const isInline = displayMode === 'inline';
    const isFulfilling = fulfillmentStatus !== 'idle';

    const stripePromise = useMemo(
      () =>
        session ? checkoutManager.getStripe(session.publishableKey) : null,
      [session]
    );

    const embeddedOptions = useMemo(
      () =>
        session
          ? {
              clientSecret: session.clientSecret,
              onComplete: handleComplete,
              onShippingDetailsChange,
              onLineItemsChange,
            }
          : undefined,
      [session, handleComplete, onShippingDetailsChange, onLineItemsChange]
    );

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

        {isOpen && stripePromise && embeddedOptions && (
          <EmbeddedCheckoutProvider
            stripe={stripePromise}
            options={embeddedOptions}
          >
            {isInline ? (
              <CheckoutInline
                onCancel={closeCheckout}
                translations={translations}
              />
            ) : (
              <CheckoutOverlay
                isOpen={isOpen}
                onClose={closeCheckout}
                translations={translations}
              />
            )}
          </EmbeddedCheckoutProvider>
        )}

        {isFulfilling && (
          <CheckoutStatus
            fulfillmentStatus={fulfillmentStatus}
            fulfillmentResult={fulfillmentResult}
            onRetry={retryFulfillment}
            onDismiss={reset}
            translations={translations}
          />
        )}
      </div>
    );
  }
);

CioCheckout.displayName = 'CioCheckout';

export default CioCheckout;
