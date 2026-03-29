import { renderToString } from 'react-dom/server';

import CheckoutForm from '@src/app/components/CheckoutForm';

describe('CheckoutForm: server', () => {
  it('renders without throwing on the server', () => {
    const view = renderToString(<CheckoutForm />);
    expect(view).toContain('cio-checkout-form');
  });

  it('renders the Stripe embedded checkout', () => {
    const view = renderToString(<CheckoutForm />);
    expect(view).toContain('stripe-embedded-checkout');
  });
});
