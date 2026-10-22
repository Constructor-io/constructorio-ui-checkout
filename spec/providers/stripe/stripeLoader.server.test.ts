import stripeLoader from '@src/providers/stripe/stripeLoader';

describe('StripeLoader: server', () => {
  afterEach(() => {
    stripeLoader.clearAll();
  });

  it('can be imported in a server environment', () => {
    expect(stripeLoader).toBeDefined();
  });

  it('returns a promise from getStripe', () => {
    const result = stripeLoader.getStripe('pk_test_key');
    expect(result).toBeInstanceOf(Promise);
  });

  it('caches the same promise for identical keys', () => {
    const a = stripeLoader.getStripe('pk_test_key');
    const b = stripeLoader.getStripe('pk_test_key');
    expect(a).toBe(b);
  });

  it('clears a specific key', () => {
    const a = stripeLoader.getStripe('pk_test_key');
    stripeLoader.clearStripe('pk_test_key');
    const b = stripeLoader.getStripe('pk_test_key');
    expect(a).not.toBe(b);
  });
});
