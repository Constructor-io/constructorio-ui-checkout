import { renderToString } from 'react-dom/server';

import CheckoutTrigger from '@src/app/components/CheckoutTrigger';

describe(`${CheckoutTrigger.name}: server`, () => {
  const noop = () => {};

  it('renders the default trigger with label', () => {
    const view = renderToString(
      <CheckoutTrigger onClick={noop} isLoading={false} />
    );
    expect(view).toContain('Checkout');
    expect(view).toContain('cio-checkout-trigger');
  });

  it('renders a custom label', () => {
    const view = renderToString(
      <CheckoutTrigger onClick={noop} isLoading={false} label="Buy Now" />
    );
    expect(view).toContain('Buy Now');
  });

  it('renders loading state', () => {
    const view = renderToString(<CheckoutTrigger onClick={noop} isLoading />);
    expect(view).toContain('Loading...');
    expect(view).toContain('cio-checkout-trigger-spinner');
  });

  it('renders a custom child element', () => {
    const view = renderToString(
      <CheckoutTrigger onClick={noop} isLoading={false}>
        <span>Custom</span>
      </CheckoutTrigger>
    );
    expect(view).toContain('Custom');
  });

  it('renders a non-element child in a wrapper button', () => {
    const view = renderToString(
      <CheckoutTrigger onClick={noop} isLoading={false}>
        Plain text trigger
      </CheckoutTrigger>
    );
    expect(view).toContain('Plain text trigger');
    expect(view).toContain('cio-checkout-trigger-custom');
  });
});
