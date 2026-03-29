import { cloneElement, isValidElement } from 'react';

import { Button } from '@constructor-io/constructorio-ui-components';

import type { Translations } from '@src/types';
import { t } from '@src/utils';

interface CheckoutTriggerProps {
  onClick: () => void;
  isLoading: boolean;
  label?: string;
  children?: React.ReactNode;
  translations?: Translations;
}

export default function CheckoutTrigger({
  onClick,
  isLoading,
  label,
  children,
  translations,
}: CheckoutTriggerProps) {
  const buttonLabel =
    label ?? t(translations, 'CioCheckout.checkout.buttonLabel');
  const loadingLabel = t(
    translations,
    'CioCheckout.checkout.buttonLoadingLabel'
  );
  if (children) {
    if (isValidElement(children)) {
      return cloneElement(
        children as React.ReactElement<Record<string, unknown>>,
        {
          onClick,
          disabled: isLoading,
          'aria-label': buttonLabel,
        }
      );
    }

    return (
      <Button
        className="cio-checkout-trigger cio-checkout-trigger-custom"
        onClick={onClick}
        disabled={isLoading}
        aria-label={buttonLabel}
      >
        {children}
      </Button>
    );
  }

  return (
    <Button
      className="cio-checkout-trigger"
      onClick={onClick}
      disabled={isLoading}
    >
      {isLoading ? (
        <span className="cio-checkout-trigger-spinner" aria-hidden="true" />
      ) : null}
      {isLoading ? loadingLabel : buttonLabel}
    </Button>
  );
}
