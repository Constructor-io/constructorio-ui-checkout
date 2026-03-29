import checkoutManager from '@src/manager/CheckoutManager';

describe('CheckoutManager: server', () => {
  afterEach(() => {
    checkoutManager.clearAll();
  });

  it('can be imported in a server environment', () => {
    expect(checkoutManager).toBeDefined();
  });

  it('returns a promise from getStripe', () => {
    const result = checkoutManager.getStripe('pk_test_key');
    expect(result).toBeInstanceOf(Promise);
  });

  it('caches the same promise for identical keys', () => {
    const a = checkoutManager.getStripe('pk_test_key');
    const b = checkoutManager.getStripe('pk_test_key');
    expect(a).toBe(b);
  });

  it('clears a specific key', () => {
    const a = checkoutManager.getStripe('pk_test_key');
    checkoutManager.clearStripe('pk_test_key');
    const b = checkoutManager.getStripe('pk_test_key');
    expect(a).not.toBe(b);
  });
});
