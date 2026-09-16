import checkoutRegistry from '@src/registry/CheckoutRegistry';
import CioCheckout from '@src/standalone';

import {
  DEMO_CLIENT_SECRET,
  DEMO_PUBLISHABLE_KEY,
} from '../__tests__/constants';

const SESSION = {
  clientSecret: DEMO_CLIENT_SECRET,
  publishableKey: DEMO_PUBLISHABLE_KEY,
};

const stubSession = () => Promise.resolve(SESSION);

describe('CioCheckout standalone', () => {
  beforeEach(() => {
    globalThis.sessionStorage.clear();
  });

  afterEach(() => {
    checkoutRegistry.clear();
    globalThis.sessionStorage.clear();
  });

  it('exposes a version string', () => {
    expect(typeof CioCheckout.VERSION).toBe('string');
    expect(CioCheckout.VERSION.length).toBeGreaterThan(0);
  });

  it('exposes the CheckoutFlow class', () => {
    expect(typeof CioCheckout.CheckoutFlow).toBe('function');
  });

  it('exposes createCheckoutFlow factory', () => {
    expect(typeof CioCheckout.createCheckoutFlow).toBe('function');
  });

  it('exposes createSessionStorageAdapter helper', () => {
    const adapter = CioCheckout.createSessionStorageAdapter();
    expect(adapter).toHaveProperty('load');
    expect(adapter).toHaveProperty('save');
    expect(adapter).toHaveProperty('clear');
  });

  it('exposes checkoutRegistry singleton', () => {
    expect(CioCheckout.checkoutRegistry).toBe(checkoutRegistry);
  });

  it('resume() creates a storage-backed flow, registers it, and hydrates on the next call', async () => {
    const first = CioCheckout.resume({
      steps: [{ id: 'a' }, { id: 'b' }],
      onCreateSession: stubSession,
      storageKey: 'user-standalone',
      storageSaveDebounceMs: 0,
    });
    expect(CioCheckout.checkoutRegistry.getFlow()).toBe(first);
    await first.start();
    await first.next();
    await new Promise((r) => setTimeout(r, 10));
    first.destroy();

    const second = CioCheckout.resume({
      steps: [{ id: 'a' }, { id: 'b' }],
      onCreateSession: stubSession,
      storageKey: 'user-standalone',
    });
    await second.start();
    expect(second.getState().currentStepId).toBe('b');
  });

  it('reset() clears the registered flow', () => {
    const flow = CioCheckout.resume({
      steps: [{ id: 'a' }],
      onCreateSession: stubSession,
      storageKey: 'user-reset',
    });
    expect(CioCheckout.checkoutRegistry.getFlow()).toBe(flow);
    CioCheckout.reset();
    expect(CioCheckout.checkoutRegistry.getFlow()).toBeNull();
  });
});
