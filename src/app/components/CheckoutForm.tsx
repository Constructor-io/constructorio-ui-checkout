import {
  CheckoutForm as StripeCheckoutForm,
  useCheckoutForm,
} from '@stripe/react-stripe-js/checkout';
import type { StripeCheckoutFormConfirmEvent } from '@stripe/stripe-js';

interface CheckoutFormProps {
  onComplete: () => void;
  onError?: (error: Error) => void;
  onSessionExpired?: () => void;
  layout?: 'expanded' | 'compact';
}

export default function CheckoutForm({
  onComplete,
  onError,
  onSessionExpired,
  layout,
}: CheckoutFormProps) {
  const checkoutState = useCheckoutForm();

  if (checkoutState.type === 'error') {
    const message = checkoutState.error.message;
    if (message.toLowerCase().includes('expired')) {
      onSessionExpired?.();
    } else {
      onError?.(new Error(message));
    }
    return null;
  }

  if (checkoutState.type === 'loading') {
    return (
      <div className="cio-checkout-form">
        <div className="cio-checkout-form-loading" />
      </div>
    );
  }

  const { checkout } = checkoutState;

  if (checkout.status.type === 'expired') {
    onSessionExpired?.();
    return null;
  }

  const handleConfirm = async (event: StripeCheckoutFormConfirmEvent) => {
    try {
      const result = await checkout.confirm({ formConfirmEvent: event });
      if (result.type === 'success') {
        onComplete();
      } else if (result.type === 'error') {
        onError?.(new Error(result.error.message));
      }
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  };

  return (
    <div className="cio-checkout-form">
      <StripeCheckoutForm onConfirm={handleConfirm} options={{ layout }} />
    </div>
  );
}
