import { Button } from '@constructor-io/constructorio-ui-components';

import type { Translations } from '@src/types';
import { t } from '@src/utils';

import CheckoutForm from './CheckoutForm';

interface CheckoutInlineProps {
  onCancel: () => void;
  translations?: Translations;
}

export default function CheckoutInline({
  onCancel,
  translations,
}: CheckoutInlineProps) {
  return (
    <div className="cio-checkout-inline">
      <div className="cio-checkout-inline-header">
        <h2 className="cio-checkout-inline-title">
          {t(translations, 'CioCheckout.checkout.title')}
        </h2>
        <Button variant="outline" size="sm" onClick={onCancel}>
          {t(translations, 'CioCheckout.checkout.cancelLabel')}
        </Button>
      </div>
      <div className="cio-checkout-inline-body">
        <CheckoutForm />
      </div>
    </div>
  );
}
