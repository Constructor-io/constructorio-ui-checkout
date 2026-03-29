import { forwardRef, useImperativeHandle, useMemo } from 'react';

import { EmbeddedCheckoutProvider } from '@stripe/react-stripe-js';

import checkoutManager from '@src/manager/CheckoutManager';
import type { CioCheckoutHandle, CioCheckoutProps } from '@src/types';

import CheckoutInline from './components/CheckoutInline';
import CheckoutOverlay from './components/CheckoutOverlay';
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
    } = props;

    const {
      isOpen,
      isLoading,
      session,
      error,
      openCheckout,
      closeCheckout,
      handleComplete,
      reset,
    } = useCheckoutSession(props, callbacks);

    useImperativeHandle(ref, () => ({ reset }), [reset]);

    const showTrigger = triggerWhen ? triggerWhen(triggerState ?? {}) : true;
    const isInline = displayMode === 'inline';

    const stripePromise = useMemo(
      () =>
        session ? checkoutManager.getStripe(session.publishableKey) : null,
      [session]
    );

    const embeddedOptions = useMemo(
      () =>
        session
          ? { clientSecret: session.clientSecret, onComplete: handleComplete }
          : undefined,
      [session, handleComplete]
    );

    return (
      <div className="cio-checkout-root">
        {showTrigger && !(isInline && isOpen) && (
          <CheckoutTrigger
            onClick={openCheckout}
            isLoading={isLoading}
            label={triggerLabel}
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
              <CheckoutInline onCancel={closeCheckout} />
            ) : (
              <CheckoutOverlay isOpen={isOpen} onClose={closeCheckout} />
            )}
          </EmbeddedCheckoutProvider>
        )}
      </div>
    );
  }
);

CioCheckout.displayName = 'CioCheckout';

export default CioCheckout;
