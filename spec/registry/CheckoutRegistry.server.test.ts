import checkoutRegistry from '@src/registry/CheckoutRegistry';

describe('CheckoutRegistry: server', () => {
  afterEach(() => {
    checkoutRegistry.clear();
  });

  it('can be imported in a server environment', () => {
    expect(checkoutRegistry).toBeDefined();
  });

  it('registers and retrieves a static session', () => {
    const session = { clientSecret: 'cs_test', publishableKey: 'pk_test' };
    checkoutRegistry.register(session);
    expect(checkoutRegistry.getSession()).toBe(session);
  });

  it('registers and retrieves an async session', () => {
    const sessionFn = () =>
      Promise.resolve({ clientSecret: 'cs_test', publishableKey: 'pk_test' });
    checkoutRegistry.register(sessionFn);
    expect(checkoutRegistry.getSession()).toBe(sessionFn);
  });

  it('returns null when no session is registered', () => {
    expect(checkoutRegistry.getSession()).toBeNull();
  });

  it('reports isRegistered correctly', () => {
    expect(checkoutRegistry.isRegistered()).toBe(false);
    checkoutRegistry.register({ clientSecret: 'cs', publishableKey: 'pk' });
    expect(checkoutRegistry.isRegistered()).toBe(true);
  });
});
