import { renderToString } from 'react-dom/server';

import CheckoutInline from '@src/app/components/CheckoutInline';

describe('CheckoutInline: server', () => {
  const onCancel = vi.fn();

  it('renders inline checkout markup', () => {
    const view = renderToString(<CheckoutInline onCancel={onCancel} />);
    expect(view).toContain('cio-checkout-inline');
    expect(view).toContain('Checkout');
  });

  it('renders the cancel button', () => {
    const view = renderToString(<CheckoutInline onCancel={onCancel} />);
    expect(view).toContain('Cancel');
  });

  it('renders the checkout form container', () => {
    const view = renderToString(<CheckoutInline onCancel={onCancel} />);
    expect(view).toContain('cio-checkout-inline__body');
    expect(view).toContain('cio-checkout-form');
  });
});
