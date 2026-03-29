import { renderToString } from 'react-dom/server';

import CheckoutOverlay from '@src/app/components/CheckoutOverlay';

describe('CheckoutOverlay: server', () => {
  const onClose = vi.fn();

  it('renders nothing when not open', () => {
    const view = renderToString(
      <CheckoutOverlay isOpen={false} onClose={onClose} />
    );
    expect(view).toBe('');
  });

  it('renders the dialog markup when open', () => {
    const view = renderToString(<CheckoutOverlay isOpen onClose={onClose} />);
    expect(view).toContain('cio-checkout-overlay');
    expect(view).toContain('Checkout');
  });

  it('renders the close button when open', () => {
    const view = renderToString(<CheckoutOverlay isOpen onClose={onClose} />);
    expect(view).toContain('aria-label="Close checkout"');
  });
});
