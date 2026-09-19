import cioCheckoutRegistry from '@src/manager/CioCheckoutRegistry';
import CioCheckout from '@src/standalone';
import type { StripePaymentSession } from '@src/types';

import {
  DEMO_CLIENT_SECRET,
  DEMO_PUBLISHABLE_KEY,
} from '../__tests__/constants';

const SESSION: StripePaymentSession = {
  clientSecret: DEMO_CLIENT_SECRET,
  publishableKey: DEMO_PUBLISHABLE_KEY,
};

const stubSession = () => Promise.resolve(SESSION);

describe('CioCheckout: client', () => {
  beforeEach(() => {
    globalThis.sessionStorage.clear();
  });

  afterEach(() => {
    cioCheckoutRegistry.clear();
    globalThis.sessionStorage.clear();
  });

  it('exposes a version string', () => {
    expect(typeof CioCheckout.VERSION).toBe('string');
    expect(CioCheckout.VERSION.length).toBeGreaterThan(0);
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

  it('exposes cioCheckoutRegistry singleton', () => {
    expect(CioCheckout.cioCheckoutRegistry).toBe(cioCheckoutRegistry);
  });

  it('resume() creates a storage-backed flow, registers it, and hydrates on the next call', async () => {
    const first = CioCheckout.resume({
      provider: 'stripe',
      steps: [{ id: 'a' }, { id: 'b' }],
      onCreateSession: stubSession,
      storageKey: 'user-standalone',
      storageSaveDebounceMs: 0,
    });
    expect(CioCheckout.cioCheckoutRegistry.getFlow()).toBe(first);
    await first.start();
    await first.next();
    await new Promise((r) => setTimeout(r, 10));
    first.destroy();

    const second = CioCheckout.resume({
      provider: 'stripe',
      steps: [{ id: 'a' }, { id: 'b' }],
      onCreateSession: stubSession,
      storageKey: 'user-standalone',
    });
    await second.start();
    expect(second.getState().currentStepId).toBe('b');
  });

  it('reset() clears the registered flow', () => {
    const flow = CioCheckout.resume({
      provider: 'stripe',
      steps: [{ id: 'a' }],
      onCreateSession: stubSession,
      storageKey: 'user-reset',
    });
    expect(CioCheckout.cioCheckoutRegistry.getFlow()).toBe(flow);
    CioCheckout.reset();
    expect(CioCheckout.cioCheckoutRegistry.getFlow()).toBeNull();
  });
});
