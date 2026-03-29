import checkoutRegistry from '@src/registry/CheckoutRegistry';
import type { CheckoutSessionResponse } from '@src/types';

import {
  DEMO_CLIENT_SECRET,
  DEMO_PUBLISHABLE_KEY,
} from '../__tests__/constants';

describe('CheckoutRegistry', () => {
  afterEach(() => {
    checkoutRegistry.clear();
  });

  it('starts with no session registered', () => {
    expect(checkoutRegistry.getSession()).toBeNull();
    expect(checkoutRegistry.isRegistered()).toBe(false);
  });

  it('registers a static session', () => {
    const session: CheckoutSessionResponse = {
      clientSecret: DEMO_CLIENT_SECRET,
      publishableKey: DEMO_PUBLISHABLE_KEY,
    };
    checkoutRegistry.register(session);

    expect(checkoutRegistry.isRegistered()).toBe(true);
    expect(checkoutRegistry.getSession()).toBe(session);
  });

  it('registers a function session', () => {
    const sessionFn = vi.fn().mockResolvedValue({
      clientSecret: DEMO_CLIENT_SECRET,
      publishableKey: DEMO_PUBLISHABLE_KEY,
    });
    checkoutRegistry.register(sessionFn);

    expect(checkoutRegistry.isRegistered()).toBe(true);
    expect(checkoutRegistry.getSession()).toBe(sessionFn);
  });

  it('overwrites a previously registered session', () => {
    const session1: CheckoutSessionResponse = {
      clientSecret: 'cs_test_first_secret_aaa',
      publishableKey: DEMO_PUBLISHABLE_KEY,
    };
    const session2: CheckoutSessionResponse = {
      clientSecret: 'cs_test_second_secret_bbb',
      publishableKey: DEMO_PUBLISHABLE_KEY,
    };

    checkoutRegistry.register(session1);
    checkoutRegistry.register(session2);

    expect(checkoutRegistry.getSession()).toBe(session2);
  });

  it('clears the registered session', () => {
    checkoutRegistry.register({
      clientSecret: DEMO_CLIENT_SECRET,
      publishableKey: DEMO_PUBLISHABLE_KEY,
    });

    checkoutRegistry.clear();

    expect(checkoutRegistry.getSession()).toBeNull();
    expect(checkoutRegistry.isRegistered()).toBe(false);
  });
});
