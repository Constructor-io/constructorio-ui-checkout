import { useEffect, useRef } from 'react';

import {
  CheckoutForm as StripeCheckoutForm,
  useCheckoutForm,
} from '@stripe/react-stripe-js/checkout';
import type { StripeCheckoutFormConfirmEvent } from '@stripe/stripe-js';

import type { CheckoutLayout, CheckoutRedirectBehavior } from '@src/types';

import './CheckoutForm.css';

interface CheckoutFormProps {
  onComplete: () => void;
  onError?: (error: Error) => void;
  onSessionExpired?: () => void;
  layout?: CheckoutLayout;
  redirectBehavior?: CheckoutRedirectBehavior;
}

export default function CheckoutForm({
  onComplete,
  onError,
  onSessionExpired,
  layout,
  redirectBehavior = 'if_required',
}: CheckoutFormProps) {
  const checkoutState = useCheckoutForm();

  const errorMessage =
    checkoutState.type === 'error' ? checkoutState.error.message : null;
  const stripeExpired =
    checkoutState.type === 'success' &&
    checkoutState.checkout.status.type === 'expired';
  const messageExpired = errorMessage
    ? errorMessage.toLowerCase().includes('expired')
    : false;

  const onErrorRef = useRef(onError);
  const onSessionExpiredRef = useRef(onSessionExpired);
  onErrorRef.current = onError;
  onSessionExpiredRef.current = onSessionExpired;
  const notifiedRef = useRef<string | null>(null);

  useEffect(() => {
    const key = stripeExpired || messageExpired ? 'expired' : errorMessage;
    if (key === notifiedRef.current) return;
    notifiedRef.current = key;
    if (key === 'expired') {
      onSessionExpiredRef.current?.();
    } else if (key) {
      onErrorRef.current?.(new Error(key));
    }
  }, [stripeExpired, messageExpired, errorMessage]);

  if (checkoutState.type === 'error') return null;

  if (checkoutState.type === 'loading') {
    return (
      <div className="cio-checkout-form">
        <div className="cio-checkout-form-loading" />
      </div>
    );
  }

  const { checkout } = checkoutState;

  if (stripeExpired) return null;

  const handleConfirm = async (event: StripeCheckoutFormConfirmEvent) => {
    try {
      const result = await checkout.confirm({
        formConfirmEvent: event,
        redirect: redirectBehavior,
      });
      if (result.type === 'success') {
        onComplete();
      } else if (result.type === 'error') {
        onError?.(new Error(result.error.message));
      }
    } catch (reason) {
      onError?.(reason instanceof Error ? reason : new Error(String(reason)));
    }
  };

  return (
    <div className="cio-checkout-form">
      <StripeCheckoutForm onConfirm={handleConfirm} options={{ layout }} />
    </div>
  );
}
