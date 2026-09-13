import { createCheckoutFlow } from '@src/core/createCheckoutFlow';
import type { CheckoutItem, CheckoutSessionResponse } from '@src/types';

const sessionResponse = (id = 'cs_test_abc'): CheckoutSessionResponse => ({
  clientSecret: `${id}_secret_xyz`,
  publishableKey: 'pk_test',
});

const stubSession = () => Promise.resolve(sessionResponse());

const item = (name: string, qty = 1): CheckoutItem => ({
  name,
  amount: 10,
  quantity: qty,
});

describe('createCheckoutFlow: syncCart (explicit, immediate)', () => {
  it('updates the local cart snapshot when no session is active', async () => {
    const flow = createCheckoutFlow({
      steps: [{ id: 'a' }],
      onCreateSession: stubSession,
    });
    const result = await flow.syncCart([item('A'), item('B')]);
    expect(result).toBeNull();
    expect(flow.getState().cartSnapshot).toHaveLength(2);
  });

  it('calls onUpdateSession when a session is active', async () => {
    const onUpdateSession = vi.fn(() =>
      Promise.resolve(sessionResponse('cs_test_updated'))
    );
    const flow = createCheckoutFlow({
      steps: [{ id: 'a' }],
      onCreateSession: stubSession,
      onUpdateSession,
    });
    await flow.createSession();
    await flow.syncCart([item('A')]);
    expect(onUpdateSession).toHaveBeenCalledWith(
      expect.objectContaining({ items: [item('A')], reason: 'items' })
    );
  });

  it('cancels any pending debounced setCart flush', async () => {
    vi.useFakeTimers();
    const onUpdateSession = vi.fn(() =>
      Promise.resolve(sessionResponse('cs_test_updated'))
    );
    const flow = createCheckoutFlow({
      steps: [{ id: 'a' }],
      onCreateSession: stubSession,
      onUpdateSession,
      cartDebounceMs: 100,
    });
    await flow.createSession();
    flow.setCart([item('A')]);
    void flow.syncCart([item('B')]);
    await vi.advanceTimersByTimeAsync(200);
    expect(onUpdateSession).toHaveBeenCalledTimes(1);
    expect(onUpdateSession).toHaveBeenCalledWith(
      expect.objectContaining({ items: [item('B')] })
    );
    vi.useRealTimers();
    flow.destroy();
  });
});

describe('createCheckoutFlow: setCart (reactive, debounced)', () => {
  it('debounces rapid setCart calls into a single updateSession', async () => {
    vi.useFakeTimers();
    const onUpdateSession = vi.fn(() =>
      Promise.resolve(sessionResponse('cs_test_updated'))
    );
    const flow = createCheckoutFlow({
      steps: [{ id: 'a' }],
      onCreateSession: stubSession,
      onUpdateSession,
      cartDebounceMs: 200,
    });
    await flow.createSession();
    flow.setCart([item('A')]);
    flow.setCart([item('A'), item('B')]);
    flow.setCart([item('A'), item('B'), item('C')]);
    await vi.advanceTimersByTimeAsync(100);
    expect(onUpdateSession).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(200);
    expect(onUpdateSession).toHaveBeenCalledTimes(1);
    expect(onUpdateSession).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [item('A'), item('B'), item('C')],
      })
    );
    vi.useRealTimers();
    flow.destroy();
  });

  it('flushes immediately when cartDebounceMs is 0', async () => {
    const onUpdateSession = vi.fn(() =>
      Promise.resolve(sessionResponse('cs_test_updated'))
    );
    const flow = createCheckoutFlow({
      steps: [{ id: 'a' }],
      onCreateSession: stubSession,
      onUpdateSession,
      cartDebounceMs: 0,
    });
    await flow.createSession();
    flow.setCart([item('A')]);
    await new Promise((r) => setTimeout(r, 5));
    expect(onUpdateSession).toHaveBeenCalledTimes(1);
    flow.destroy();
  });

  it('accepts and preserves an initial cart from config.cart', () => {
    const flow = createCheckoutFlow({
      steps: [{ id: 'a' }],
      onCreateSession: stubSession,
      cart: [item('A'), item('B')],
    });
    expect(flow.getState().cartSnapshot).toEqual([item('A'), item('B')]);
    flow.destroy();
  });

  it('destroy cancels any pending debounced cart flush', async () => {
    vi.useFakeTimers();
    const onUpdateSession = vi.fn(() =>
      Promise.resolve(sessionResponse('cs_test_updated'))
    );
    const flow = createCheckoutFlow({
      steps: [{ id: 'a' }],
      onCreateSession: stubSession,
      onUpdateSession,
      cartDebounceMs: 400,
    });
    await flow.createSession();
    flow.setCart([item('A')]);
    flow.destroy();
    await vi.advanceTimersByTimeAsync(1000);
    expect(onUpdateSession).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});

describe('createCheckoutFlow: cart integrity through updateSession queue', () => {
  it('serializes concurrent syncCart calls', async () => {
    const order: string[] = [];
    const controllers: Array<() => void> = [];
    const onUpdateSession = vi.fn(
      (patch: { items?: CheckoutItem[] }) =>
        new Promise<CheckoutSessionResponse>((resolve) => {
          order.push(patch.items?.[0]?.name ?? '?');
          controllers.push(() => resolve(sessionResponse('cs_test_ok')));
        })
    );
    const flow = createCheckoutFlow({
      steps: [{ id: 'a' }],
      onCreateSession: stubSession,
      onUpdateSession,
    });
    await flow.createSession();
    const p1 = flow.syncCart([item('first')]);
    const p2 = flow.syncCart([item('second')]);
    expect(order).toEqual(['first']);
    controllers[0]();
    await p1;
    expect(order).toEqual(['first', 'second']);
    controllers[1]();
    await p2;
    flow.destroy();
  });
});
