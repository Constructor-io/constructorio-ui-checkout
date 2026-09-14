import { renderToString } from 'react-dom/server';

import CheckoutFormElements from '@src/app/components/CheckoutFormElements';

describe(`${CheckoutFormElements.name}: server`, () => {
  it('renders without throwing on the server', () => {
    const view = renderToString(<CheckoutFormElements onComplete={vi.fn()} />);
    expect(view).toContain('cio-checkout-form');
  });

  it('renders the payment element', () => {
    const view = renderToString(<CheckoutFormElements onComplete={vi.fn()} />);
    expect(view).toContain('stripe-payment-element');
  });

  it('renders the pay button', () => {
    const view = renderToString(<CheckoutFormElements onComplete={vi.fn()} />);
    expect(view).toContain('cio-checkout-pay-button');
  });
});
