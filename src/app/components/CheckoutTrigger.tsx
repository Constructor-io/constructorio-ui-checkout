import { cloneElement, isValidElement } from 'react';

import { Button } from '@constructor-io/constructorio-ui-components';

interface CheckoutTriggerProps {
  onClick: () => void;
  isLoading: boolean;
  label?: string;
  children?: React.ReactNode;
}

export default function CheckoutTrigger({
  onClick,
  isLoading,
  label = 'Checkout',
  children,
}: CheckoutTriggerProps) {
  if (children) {
    if (isValidElement(children)) {
      return cloneElement(
        children as React.ReactElement<Record<string, unknown>>,
        {
          onClick,
          disabled: isLoading,
          'aria-label': label,
        }
      );
    }

    return (
      <Button
        className="cio-checkout-trigger cio-checkout-trigger--custom"
        onClick={onClick}
        disabled={isLoading}
        aria-label={label}
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
        <span className="cio-checkout-trigger__spinner" aria-hidden="true" />
      ) : null}
      {isLoading ? 'Loading...' : label}
    </Button>
  );
}
