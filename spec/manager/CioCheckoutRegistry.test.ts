import cioCheckoutRegistry, {
  CioCheckoutRegistry,
} from '@src/manager/CioCheckoutRegistry';
import { CioCheckoutFlow } from '@src/manager/CioCheckoutFlow';

import {
  DEMO_CLIENT_SECRET,
  DEMO_PUBLISHABLE_KEY,
} from '../__tests__/constants';

const stubSession = () =>
  Promise.resolve({
    clientSecret: DEMO_CLIENT_SECRET,
    publishableKey: DEMO_PUBLISHABLE_KEY,
  });

describe(`${CioCheckoutRegistry.name}: client`, () => {
  beforeEach(() => {
    globalThis.sessionStorage.clear();
  });

  afterEach(() => {
    cioCheckoutRegistry.clear();
    globalThis.sessionStorage.clear();
  });

  it('starts with no flow registered', () => {
    expect(cioCheckoutRegistry.hasFlow()).toBe(false);
    expect(cioCheckoutRegistry.getFlow()).toBeNull();
  });

  it('register stores an existing flow instance', () => {
    const flow = new CioCheckoutFlow({
      steps: [{ id: 'a' }],
      onCreateSession: stubSession,
    });
    cioCheckoutRegistry.register(flow);
    expect(cioCheckoutRegistry.hasFlow()).toBe(true);
    expect(cioCheckoutRegistry.getFlow()).toBe(flow);
  });

  it('register destroys the previous flow when replacing', () => {
    const first = new CioCheckoutFlow({
      steps: [{ id: 'a' }],
      onCreateSession: stubSession,
    });
    const destroySpy = vi.spyOn(first, 'destroy');
    cioCheckoutRegistry.register(first);

    const second = new CioCheckoutFlow({
      steps: [{ id: 'b' }],
      onCreateSession: stubSession,
    });
    cioCheckoutRegistry.register(second);

    expect(destroySpy).toHaveBeenCalledTimes(1);
    expect(cioCheckoutRegistry.getFlow()).toBe(second);
  });

  it('clear destroys and unregisters the flow', () => {
    const flow = new CioCheckoutFlow({
      steps: [{ id: 'a' }],
      onCreateSession: stubSession,
    });
    const destroySpy = vi.spyOn(flow, 'destroy');
    cioCheckoutRegistry.register(flow);
    cioCheckoutRegistry.clear();
    expect(destroySpy).toHaveBeenCalledTimes(1);
    expect(cioCheckoutRegistry.hasFlow()).toBe(false);
  });

  it('resume() creates a storage-backed flow and registers it', async () => {
    const flow = cioCheckoutRegistry.resume({
      steps: [{ id: 'a' }, { id: 'b' }],
      onCreateSession: stubSession,
      storageKey: 'user-r',
      storageSaveDebounceMs: 0,
    });
    expect(flow).toBeInstanceOf(CioCheckoutFlow);
    expect(cioCheckoutRegistry.getFlow()).toBe(flow);

    await flow.start();
    await flow.next();
    await new Promise((r) => setTimeout(r, 10));
    flow.destroy();

    const resumed = cioCheckoutRegistry.resume({
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
    const flow = cioCheckoutRegistry.resume({
      steps: [{ id: 'a' }],
      onCreateSession: stubSession,
      storage: custom,
      storageKey: 'user-c',
    });
    expect(flow).toBeInstanceOf(CioCheckoutFlow);
  });
});
