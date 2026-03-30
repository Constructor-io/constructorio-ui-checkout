import { renderToString } from 'react-dom/server';

import CheckoutStatus from '@src/app/components/CheckoutStatus';

describe(`${CheckoutStatus.name}: server`, () => {
  it('renders nothing when idle', () => {
    const view = renderToString(
      <CheckoutStatus
        fulfillmentStatus="idle"
        fulfillmentResult={null}
        onRetry={() => {}}
        onDismiss={() => {}}
      />
    );
    expect(view).toBe('');
  });

  it('renders pending state on the server', () => {
    const view = renderToString(
      <CheckoutStatus
        fulfillmentStatus="pending"
        fulfillmentResult={null}
        onRetry={() => {}}
        onDismiss={() => {}}
      />
    );
    expect(view).toContain('cio-checkout-status');
    expect(view).toContain('Verifying your order');
  });

  it('renders fulfilled state on the server', () => {
    const view = renderToString(
      <CheckoutStatus
        fulfillmentStatus="fulfilled"
        fulfillmentResult={{ success: true, message: 'Order #99' }}
        onRetry={() => {}}
        onDismiss={() => {}}
      />
    );
    expect(view).toContain('Order Confirmed');
    expect(view).toContain('Order #99');
  });

  it('renders failed state on the server', () => {
    const view = renderToString(
      <CheckoutStatus
        fulfillmentStatus="failed"
        fulfillmentResult={{ success: false, message: 'Timeout' }}
        onRetry={() => {}}
        onDismiss={() => {}}
      />
    );
    expect(view).toContain('Verification Failed');
    expect(view).toContain('Timeout');
  });
});
