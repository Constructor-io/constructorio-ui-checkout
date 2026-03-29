import { Button } from '@constructor-io/constructorio-ui-components';

import CheckoutForm from './CheckoutForm';

interface CheckoutInlineProps {
  onCancel: () => void;
}

export default function CheckoutInline({ onCancel }: CheckoutInlineProps) {
  return (
    <div className="cio-checkout-inline">
      <div className="cio-checkout-inline__header">
        <h2 className="cio-checkout-inline__title">Checkout</h2>
        <Button
          variant="outline"
          size="sm"
          className="cio-checkout-inline__cancel"
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
      <div className="cio-checkout-inline__body">
        <CheckoutForm />
      </div>
    </div>
  );
}
