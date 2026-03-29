import { loadStripe } from '@stripe/stripe-js';

import checkoutManager from '@src/manager/CheckoutManager';

import { DEMO_PUBLISHABLE_KEY } from '../__tests__/constants';

describe('CheckoutManager', () => {
  afterEach(() => {
    checkoutManager.clearAll();
  });

  it('calls loadStripe for a new key', async () => {
    const result = checkoutManager.getStripe(DEMO_PUBLISHABLE_KEY);
    expect(loadStripe).toHaveBeenCalledWith(DEMO_PUBLISHABLE_KEY);
    expect(result).toBeInstanceOf(Promise);
    await expect(result).resolves.toEqual({
      elements: expect.any(Function) as unknown,
    });
  });

  it('returns the same promise for the same key', async () => {
    const first = checkoutManager.getStripe(DEMO_PUBLISHABLE_KEY);
    const second = checkoutManager.getStripe(DEMO_PUBLISHABLE_KEY);
    expect(first).toBe(second);
    expect(loadStripe).toHaveBeenCalledTimes(1);
    await first;
  });

  it('calls loadStripe again for a different key', async () => {
    await checkoutManager.getStripe('pk_test_key_a');
    await checkoutManager.getStripe('pk_test_key_b');
    expect(loadStripe).toHaveBeenCalledTimes(2);
  });

  it('clears a specific key', async () => {
    await checkoutManager.getStripe(DEMO_PUBLISHABLE_KEY);
    checkoutManager.clearStripe(DEMO_PUBLISHABLE_KEY);
    await checkoutManager.getStripe(DEMO_PUBLISHABLE_KEY);
    expect(loadStripe).toHaveBeenCalledTimes(2);
  });

  it('clears all cached instances', async () => {
    await checkoutManager.getStripe('pk_test_key_a');
    await checkoutManager.getStripe('pk_test_key_b');
    checkoutManager.clearAll();
    await checkoutManager.getStripe('pk_test_key_a');
    expect(loadStripe).toHaveBeenCalledTimes(3);
  });
});
