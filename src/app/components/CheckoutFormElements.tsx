import { useCallback, useEffect, useRef, useState } from 'react';

import {
  Button,
  RenderPropsWrapper,
} from '@constructor-io/constructorio-ui-components';
import {
  CurrencySelectorElement,
  PaymentElement,
  useCheckoutElements,
} from '@stripe/react-stripe-js/checkout';
import type { StripePaymentElementChangeEvent } from '@stripe/stripe-js';

import type {
  CheckoutComponentOverrides,
  CheckoutRedirectBehavior,
  PayButtonRenderProps,
  Translations,
} from '@src/types';
import { t } from '@src/utils';

import './CheckoutFormElements.css';

interface CheckoutFormElementsProps {
  onComplete: () => void;
  onError?: (error: Error) => void;
  onSessionExpired?: () => void;
  translations?: Translations;
  componentOverrides?: CheckoutComponentOverrides;
  redirectBehavior?: CheckoutRedirectBehavior;
}

export default function CheckoutFormElements({
  onComplete,
  onError,
  onSessionExpired,
  translations,
  componentOverrides,
  redirectBehavior = 'if_required',
}: CheckoutFormElementsProps) {
  const checkoutState = useCheckoutElements();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPaymentComplete, setIsPaymentComplete] = useState(false);

  const handlePaymentChange = useCallback(
    (event: StripePaymentElementChangeEvent) => {
      setIsPaymentComplete(event.complete);
    },
    []
  );

  const errorMessage =
    checkoutState.type === 'error' ? checkoutState.error.message : null;
  const isLoading = checkoutState.type === 'loading';
  const checkout =
    checkoutState.type === 'success' ? checkoutState.checkout : null;
  const stripeExpired = checkout?.status.type === 'expired';
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

  if (checkoutState.type === 'error' || stripeExpired) return null;

  const handleClick = async () => {
    if (isSubmitting || !checkout) return;

    setIsSubmitting(true);
    try {
      const result = await checkout.confirm({ redirect: redirectBehavior });
      if (result.type === 'success') {
        onComplete();
      } else if (result.type === 'error') {
        onError?.(new Error(result.error.message));
      }
    } catch (reason) {
      onError?.(reason instanceof Error ? reason : new Error(String(reason)));
    } finally {
      setIsSubmitting(false);
    }
  };

  const amount = checkout?.total.total.amount ?? '';
  const isDisabled = isLoading || isSubmitting || !isPaymentComplete;
  const onClick = () => {
    void handleClick();
  };

  const loadingLabel = t(
    translations,
    'CioCheckout.checkout.payButtonLoadingLabel'
  );
  const payLabel = t(translations, 'CioCheckout.checkout.payButtonLabel');
  const buttonLabel = isSubmitting ? loadingLabel : `${payLabel} ${amount}`;

  const payButtonProps: PayButtonRenderProps = {
    isSubmitting,
    isDisabled,
    amount,
    onClick,
  };

  const showCurrencySelector =
    checkout?.currencyOptions && checkout.currencyOptions.length > 1;

  return (
    <div className="cio-checkout-form">
      {showCurrencySelector && <CurrencySelectorElement />}
      <PaymentElement onChange={handlePaymentChange} />
      <RenderPropsWrapper
        props={payButtonProps}
        override={componentOverrides?.payButton?.reactNode}
      >
        <Button
          className="cio-checkout-pay-button"
          onClick={onClick}
          disabled={isDisabled}
          aria-label={buttonLabel}
        >
          {buttonLabel}
        </Button>
      </RenderPropsWrapper>
    </div>
  );
}
