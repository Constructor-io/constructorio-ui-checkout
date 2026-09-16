import { CheckoutFlow } from '@src/manager/CheckoutFlow';
import checkoutRegistry from '@src/registry/CheckoutRegistry';

import {
  DEMO_CLIENT_SECRET,
  DEMO_PUBLISHABLE_KEY,
} from '../__tests__/constants';

const stubSession = () =>
  Promise.resolve({
    clientSecret: DEMO_CLIENT_SECRET,
    publishableKey: DEMO_PUBLISHABLE_KEY,
  });

describe('CheckoutRegistry', () => {
  beforeEach(() => {
    globalThis.sessionStorage.clear();
  });

  afterEach(() => {
    checkoutRegistry.clear();
    globalThis.sessionStorage.clear();
  });

  it('starts with no flow registered', () => {
    expect(checkoutRegistry.hasFlow()).toBe(false);
    expect(checkoutRegistry.getFlow()).toBeNull();
  });

  it('register stores an existing flow instance', () => {
    const flow = new CheckoutFlow({
      steps: [{ id: 'a' }],
      onCreateSession: stubSession,
    });
    checkoutRegistry.register(flow);
    expect(checkoutRegistry.hasFlow()).toBe(true);
    expect(checkoutRegistry.getFlow()).toBe(flow);
  });

  it('register destroys the previous flow when replacing', () => {
    const first = new CheckoutFlow({
      steps: [{ id: 'a' }],
      onCreateSession: stubSession,
    });
    const destroySpy = vi.spyOn(first, 'destroy');
    checkoutRegistry.register(first);

    const second = new CheckoutFlow({
      steps: [{ id: 'b' }],
      onCreateSession: stubSession,
    });
    checkoutRegistry.register(second);

    expect(destroySpy).toHaveBeenCalledTimes(1);
    expect(checkoutRegistry.getFlow()).toBe(second);
  });

  it('clear destroys and unregisters the flow', () => {
    const flow = new CheckoutFlow({
      steps: [{ id: 'a' }],
      onCreateSession: stubSession,
    });
    const destroySpy = vi.spyOn(flow, 'destroy');
    checkoutRegistry.register(flow);
    checkoutRegistry.clear();
    expect(destroySpy).toHaveBeenCalledTimes(1);
    expect(checkoutRegistry.hasFlow()).toBe(false);
  });

  it('resume() creates a storage-backed flow and registers it', async () => {
    const flow = checkoutRegistry.resume({
      steps: [{ id: 'a' }, { id: 'b' }],
      onCreateSession: stubSession,
      storageKey: 'user-r',
      storageSaveDebounceMs: 0,
    });
    expect(flow).toBeInstanceOf(CheckoutFlow);
    expect(checkoutRegistry.getFlow()).toBe(flow);

    await flow.start();
    await flow.next();
    await new Promise((r) => setTimeout(r, 10));
    flow.destroy();

    const resumed = checkoutRegistry.resume({
      steps: [{ id: 'a' }, { id: 'b' }],
      onCreateSession: stubSession,
      storageKey: 'user-r',
    });
    await resumed.start();
    expect(resumed.getState().currentStepId).toBe('b');
  });

  it('resume() respects a caller-provided storage adapter', () => {
    const custom = {
      load: vi.fn(() => Promise.resolve(null)),
      save: vi.fn(() => Promise.resolve()),
      clear: vi.fn(() => Promise.resolve()),
    };
    const flow = checkoutRegistry.resume({
      steps: [{ id: 'a' }],
      onCreateSession: stubSession,
      storage: custom,
      storageKey: 'user-c',
    });
    expect(flow).toBeInstanceOf(CheckoutFlow);
  });
});
