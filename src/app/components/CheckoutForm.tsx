import { EmbeddedCheckout, EmbeddedCheckoutProvider } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useMemo } from 'react';

interface CheckoutFormProps {
  clientSecret: string;
  publishableKey: string;
  onComplete?: () => void;
}

export default function CheckoutForm({ clientSecret, publishableKey, onComplete }: CheckoutFormProps) {
  const stripePromise = useMemo(() => loadStripe(publishableKey), [publishableKey]);

  const options = useMemo(
    () => ({
      clientSecret,
      onComplete,
    }),
    [clientSecret, onComplete]
  );

  return (
    <div className="cio-checkout-form">
      <EmbeddedCheckoutProvider stripe={stripePromise} options={options}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
