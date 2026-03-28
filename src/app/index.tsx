import type { CioCheckoutProps } from '@src/types';

import CheckoutOverlay from './components/CheckoutOverlay';
import CheckoutTrigger from './components/CheckoutTrigger';
import useCheckoutSession from './hooks/useCheckoutSession';

import '../styles.css';
import './index.css';

export default function CioCheckout(props: CioCheckoutProps) {
  const { callbacks, trigger, triggerLabel, ...sourceConfig } = props;

  const {
    isOpen,
    isLoading,
    clientSecret,
    publishableKey,
    error,
    openCheckout,
    closeCheckout,
    handleComplete,
  } = useCheckoutSession(sourceConfig, callbacks);

  return (
    <div className="cio-checkout-root">
      <CheckoutTrigger onClick={openCheckout} isLoading={isLoading} label={triggerLabel}>
        {trigger}
      </CheckoutTrigger>

      {error && (
        <div className="cio-checkout-error" role="alert">
          {error.message}
        </div>
      )}

      {isOpen && clientSecret && publishableKey && (
        <CheckoutOverlay
          isOpen={isOpen}
          clientSecret={clientSecret}
          publishableKey={publishableKey}
          onComplete={handleComplete}
          onClose={closeCheckout}
        />
      )}
    </div>
  );
}
