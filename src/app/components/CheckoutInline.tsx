import { Button } from '@constructor-io/constructorio-ui-components';

import type {
  CheckoutUiMode,
  CioCheckoutComponentOverrides,
  Translations,
} from '@src/types';
import { t } from '@src/utils';

import CheckoutForm from './CheckoutForm';
import CheckoutFormElements from './CheckoutFormElements';

interface CheckoutInlineProps {
  onCancel: () => void;
  onComplete: () => void;
  onError?: (error: Error) => void;
  onSessionExpired?: () => void;
  uiMode?: CheckoutUiMode;
  layout?: 'expanded' | 'compact';
  translations?: Translations;
  componentOverrides?: CioCheckoutComponentOverrides;
}

export default function CheckoutInline({
  onCancel,
  onComplete,
  onError,
  onSessionExpired,
  uiMode = 'elements',
  layout,
  translations,
  componentOverrides,
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
        {uiMode === 'form' ? (
          <CheckoutForm
            onComplete={onComplete}
            onError={onError}
            onSessionExpired={onSessionExpired}
            layout={layout}
          />
        ) : (
          <CheckoutFormElements
            onComplete={onComplete}
            onError={onError}
            onSessionExpired={onSessionExpired}
            translations={translations}
            componentOverrides={componentOverrides}
          />
        )}
      </div>
    </div>
  );
}
