import { renderToString } from 'react-dom/server';

import CheckoutForm from '@src/app/components/CheckoutForm';

describe(`${CheckoutForm.name}: server`, () => {
  it('renders without throwing on the server', () => {
    const view = renderToString(<CheckoutForm onComplete={vi.fn()} />);
    expect(view).toContain('cio-checkout-form');
  });

  it('renders the Stripe checkout form', () => {
    const view = renderToString(<CheckoutForm onComplete={vi.fn()} />);
    expect(view).toContain('stripe-checkout-form');
  });
});
