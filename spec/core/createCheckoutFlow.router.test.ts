import { createCheckoutFlow } from '@src/core/createCheckoutFlow';
import type { CheckoutEvent, RouterAdapter } from '@src/core/types';

const sessionStub = () =>
  Promise.resolve({
    clientSecret: 'cs_test_a_secret_x',
    publishableKey: 'pk_test',
  });

interface FakeRouter extends RouterAdapter {
  currentPath: string;
  listeners: Set<(p: string) => void>;
  navigate(path: string): void;
}

const fakeRouter = (initialPath = '/'): FakeRouter => {
  const listeners = new Set<(p: string) => void>();
  const r: FakeRouter = {
    currentPath: initialPath,
    listeners,
    push: (path) => {
      r.currentPath = path;
      listeners.forEach((l) => l(path));
    },
    getCurrentPath: () => r.currentPath,
    subscribe: (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    navigate: (path) => {
      r.currentPath = path;
      listeners.forEach((l) => l(path));
    },
  };
  return r;
};

describe('createCheckoutFlow: router integration', () => {
  it('pushes the router path when entering a routed step', async () => {
    const router = fakeRouter('/');
    const flow = createCheckoutFlow({
      steps: [
        { id: 'cart', path: '/cart' },
        { id: 'payment', path: '/checkout/payment' },
      ],
      onCreateSession: sessionStub,
      router,
    });
    await flow.start();
    expect(router.getCurrentPath()).toBe('/cart');
    await flow.next();
    expect(router.getCurrentPath()).toBe('/checkout/payment');
    flow.destroy();
  });

  it('does not push a URL for a step with no path (modal/inline step)', async () => {
    const router = fakeRouter('/cart');
    const flow = createCheckoutFlow({
      steps: [
        { id: 'cart', path: '/cart' },
        { id: 'auth' },
        { id: 'payment', path: '/checkout/payment' },
      ],
      onCreateSession: sessionStub,
      router,
    });
    await flow.start();
    expect(router.getCurrentPath()).toBe('/cart');
    await flow.next();
    expect(flow.getState().currentStepId).toBe('auth');
    expect(router.getCurrentPath()).toBe('/cart');
    await flow.next();
    expect(flow.getState().currentStepId).toBe('payment');
    expect(router.getCurrentPath()).toBe('/checkout/payment');
    flow.destroy();
  });

  it('starts at the step matching the current URL', async () => {
    const router = fakeRouter('/checkout/payment');
    const flow = createCheckoutFlow({
      steps: [
        { id: 'cart', path: '/cart' },
        { id: 'address', path: '/checkout/address' },
        { id: 'payment', path: '/checkout/payment' },
      ],
      onCreateSession: sessionStub,
      router,
    });
    await flow.start();
    expect(flow.getState().currentStepId).toBe('payment');
    flow.destroy();
  });

  it('falls back to the first step when the URL matches nothing', async () => {
    const router = fakeRouter('/unrelated');
    const flow = createCheckoutFlow({
      steps: [
        { id: 'cart', path: '/cart' },
        { id: 'payment', path: '/checkout/payment' },
      ],
      onCreateSession: sessionStub,
      router,
    });
    await flow.start();
    expect(flow.getState().currentStepId).toBe('cart');
    expect(router.getCurrentPath()).toBe('/cart');
    flow.destroy();
  });

  it('syncs state when the URL changes (browser back)', async () => {
    const router = fakeRouter('/cart');
    const flow = createCheckoutFlow({
      steps: [
        { id: 'cart', path: '/cart' },
        { id: 'payment', path: '/checkout/payment' },
      ],
      onCreateSession: sessionStub,
      router,
    });
    await flow.start();
    await flow.next();
    expect(flow.getState().currentStepId).toBe('payment');
    router.navigate('/cart');
    await new Promise((r) => setTimeout(r, 0));
    expect(flow.getState().currentStepId).toBe('cart');
    flow.destroy();
  });

  it('does not recursively push when subscribing to its own push', async () => {
    const router = fakeRouter('/');
    const pushSpy = vi.spyOn(router, 'push');
    const flow = createCheckoutFlow({
      steps: [
        { id: 'cart', path: '/cart' },
        { id: 'payment', path: '/checkout/payment' },
      ],
      onCreateSession: sessionStub,
      router,
    });
    await flow.start();
    await flow.next();
    await new Promise((r) => setTimeout(r, 5));
    expect(pushSpy).toHaveBeenCalledTimes(2);
    flow.destroy();
  });

  it('rejects javascript: and other unsafe paths', async () => {
    const events: CheckoutEvent[] = [];
    const router = fakeRouter('/');
    const pushSpy = vi.spyOn(router, 'push');
    const flow = createCheckoutFlow({
      steps: [{ id: 'bad', path: 'javascript:alert(1)' }],
      onCreateSession: sessionStub,
      router,
      onEvent: (e) => events.push(e),
    });
    await flow.start();
    expect(pushSpy).not.toHaveBeenCalled();
    expect(events.find((e) => e.type === 'error')).toMatchObject({
      source: 'router',
    });
    flow.destroy();
  });

  it('rejects data: URLs', async () => {
    const events: CheckoutEvent[] = [];
    const router = fakeRouter('/');
    const pushSpy = vi.spyOn(router, 'push');
    const flow = createCheckoutFlow({
      steps: [{ id: 'bad', path: 'data:text/html,<script>x</script>' }],
      onCreateSession: sessionStub,
      router,
      onEvent: (e) => events.push(e),
    });
    await flow.start();
    expect(pushSpy).not.toHaveBeenCalled();
    expect(events.find((e) => e.type === 'error')).toMatchObject({
      source: 'router',
    });
    flow.destroy();
  });

  it('emits error when router.push throws', async () => {
    const events: CheckoutEvent[] = [];
    const router: RouterAdapter = {
      push: () => {
        throw new Error('router boom');
      },
      getCurrentPath: () => '/',
    };
    const flow = createCheckoutFlow({
      steps: [{ id: 'cart', path: '/cart' }],
      onCreateSession: sessionStub,
      router,
      onEvent: (e) => events.push(e),
    });
    await flow.start();
    expect(events.find((e) => e.type === 'error')).toMatchObject({
      source: 'router',
    });
    flow.destroy();
  });

  it('emits error when router.getCurrentPath throws on start', async () => {
    const events: CheckoutEvent[] = [];
    const router: RouterAdapter = {
      push: vi.fn(),
      getCurrentPath: () => {
        throw new Error('unavailable');
      },
    };
    const flow = createCheckoutFlow({
      steps: [{ id: 'cart', path: '/cart' }],
      onCreateSession: sessionStub,
      router,
      onEvent: (e) => events.push(e),
    });
    await flow.start();
    expect(events.find((e) => e.type === 'error')).toMatchObject({
      source: 'router',
    });
    flow.destroy();
  });

  it('ignores unrelated URL changes (nav away from checkout)', async () => {
    const router = fakeRouter('/cart');
    const flow = createCheckoutFlow({
      steps: [
        { id: 'cart', path: '/cart' },
        { id: 'payment', path: '/checkout/payment' },
      ],
      onCreateSession: sessionStub,
      router,
    });
    await flow.start();
    router.navigate('/somewhere-else');
    await new Promise((r) => setTimeout(r, 0));
    expect(flow.getState().currentStepId).toBe('cart');
    flow.destroy();
  });

  it('unsubscribes from router on destroy', async () => {
    const router = fakeRouter('/cart');
    const flow = createCheckoutFlow({
      steps: [
        { id: 'cart', path: '/cart' },
        { id: 'payment', path: '/checkout/payment' },
      ],
      onCreateSession: sessionStub,
      router,
    });
    await flow.start();
    flow.destroy();
    expect(router.listeners.size).toBe(0);
    router.navigate('/checkout/payment');
    await new Promise((r) => setTimeout(r, 0));
    expect(flow.getState().currentStepId).toBe('cart');
  });

  it('works without router.subscribe (one-way binding)', async () => {
    const pushCalls: string[] = [];
    const router: RouterAdapter = {
      push: (p) => {
        pushCalls.push(p);
      },
      getCurrentPath: () => '/',
    };
    const flow = createCheckoutFlow({
      steps: [
        { id: 'cart', path: '/cart' },
        { id: 'payment', path: '/checkout/payment' },
      ],
      onCreateSession: sessionStub,
      router,
    });
    await flow.start();
    await flow.next();
    expect(pushCalls).toEqual(['/cart', '/checkout/payment']);
    flow.destroy();
  });
});
