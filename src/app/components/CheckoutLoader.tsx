import { RenderPropsWrapper } from '@constructor-io/constructorio-ui-components';

import type {
  CheckoutComponentOverrides,
  CheckoutLoaderRenderProps,
  Translations,
} from '@src/types';
import { t } from '@src/utils';

interface CheckoutLoaderProps {
  translations?: Translations;
  componentOverrides?: CheckoutComponentOverrides;
}

export default function CheckoutLoader({
  translations,
  componentOverrides,
}: CheckoutLoaderProps) {
  const loaderProps: CheckoutLoaderRenderProps = {
    label: t(translations, 'CioCheckout.checkout.preparingLabel'),
  };

  return (
    <RenderPropsWrapper
      props={loaderProps}
      override={componentOverrides?.loader?.reactNode}
    >
      <div className="cio-checkout-loader" role="status" aria-live="polite">
        {loaderProps.label}
      </div>
    </RenderPropsWrapper>
  );
}
