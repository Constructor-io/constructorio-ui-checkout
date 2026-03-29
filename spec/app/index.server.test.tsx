import { renderToString } from 'react-dom/server';

import * as factories from '@spec/factory';

import CioCheckout from '@src/app';
import type { CioCheckoutProps } from '@src/types';

describe(`${CioCheckout.displayName}: server`, () => {
  const props: CioCheckoutProps = factories.checkoutProps.build();

  it('renders the trigger on the server', () => {
    const view = renderToString(<CioCheckout {...props} />);
    expect(view).toContain('Checkout');
    expect(view).toContain('cio-checkout-root');
  });

  it('renders with a custom trigger label', () => {
    const view = renderToString(
      <CioCheckout {...props} triggerLabel="Buy Now" />
    );
    expect(view).toContain('Buy Now');
  });

  it('does not render checkout form in initial server render', () => {
    const view = renderToString(<CioCheckout {...props} />);
    expect(view).not.toContain('stripe-embedded-checkout');
  });
});
