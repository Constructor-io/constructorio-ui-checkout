import { loadStripe } from '@stripe/stripe-js';

import stripeLoader from '@src/providers/stripe/stripeLoader';

import { DEMO_PUBLISHABLE_KEY } from '../../__tests__/constants';

describe('StripeLoader: client', () => {
  afterEach(() => {
    stripeLoader.clearAll();
  });

  it('calls loadStripe for a new key without beta flag in elements mode', async () => {
    const result = stripeLoader.getStripe(DEMO_PUBLISHABLE_KEY, 'elements');
    expect(loadStripe).toHaveBeenCalledWith(DEMO_PUBLISHABLE_KEY, undefined);
    expect(result).toBeInstanceOf(Promise);
    await expect(result).resolves.toEqual({
      elements: expect.any(Function) as unknown,
    });
  });

  it('calls loadStripe with beta flag in form mode', async () => {
    const result = stripeLoader.getStripe(DEMO_PUBLISHABLE_KEY, 'form');
    expect(loadStripe).toHaveBeenCalledWith(DEMO_PUBLISHABLE_KEY, {
      betas: ['custom_checkout_payment_form_1'],
    });
    expect(result).toBeInstanceOf(Promise);
    await expect(result).resolves.toEqual({
      elements: expect.any(Function) as unknown,
    });
  });

  it('returns the same promise for the same key', async () => {
    const first = stripeLoader.getStripe(DEMO_PUBLISHABLE_KEY);
    const second = stripeLoader.getStripe(DEMO_PUBLISHABLE_KEY);
    expect(first).toBe(second);
    expect(loadStripe).toHaveBeenCalledTimes(1);
    await first;
  });

  it('calls loadStripe again for a different key', async () => {
    await stripeLoader.getStripe('pk_test_key_a');
    await stripeLoader.getStripe('pk_test_key_b');
    expect(loadStripe).toHaveBeenCalledTimes(2);
  });

  it('clears a specific key', async () => {
    await stripeLoader.getStripe(DEMO_PUBLISHABLE_KEY);
    stripeLoader.clearStripe(DEMO_PUBLISHABLE_KEY);
    await stripeLoader.getStripe(DEMO_PUBLISHABLE_KEY);
    expect(loadStripe).toHaveBeenCalledTimes(2);
  });

  it('clears all cached instances', async () => {
    await stripeLoader.getStripe('pk_test_key_a');
    await stripeLoader.getStripe('pk_test_key_b');
    stripeLoader.clearAll();
    await stripeLoader.getStripe('pk_test_key_a');
    expect(loadStripe).toHaveBeenCalledTimes(3);
  });
});
