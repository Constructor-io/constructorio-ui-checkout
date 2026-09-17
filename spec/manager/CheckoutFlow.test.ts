import { createSessionStorageAdapter } from '@src/core/storage/sessionStorageAdapter';
import type { CheckoutEvent } from '@src/core/types';
import { CheckoutFlow } from '@src/manager/CheckoutFlow';
import type { CheckoutItem, CheckoutSessionResponse } from '@src/types';

const sessionResponse = (id = 'cs_test_abc'): CheckoutSessionResponse => ({
  clientSecret: `${id}_secret_xyz`,
  publishableKey: 'pk_test',
});

const stubSession = () => Promise.resolve(sessionResponse());

describe(`${CheckoutFlow.name}: client`, () => {
  it('constructs with a valid config', () => {
    const flow = new CheckoutFlow({
      steps: [{ id: 'a' }],
      onCreateSession: stubSession,
    });
    expect(flow).toBeInstanceOf(CheckoutFlow);
    expect(flow.getState().currentStepId).toBeNull();
  });

  it('throws on invalid config (empty steps)', () => {
    expect(
      () =>
        new CheckoutFlow({
          steps: [],
          onCreateSession: stubSession,
        })
    ).toThrow(/non-empty array/);
  });

  it('subscribes to state changes and unsubscribes cleanly', async () => {
    const states: string[] = [];
    const flow = new CheckoutFlow({
      steps: [{ id: 'a' }, { id: 'b' }],
      onCreateSession: stubSession,
    });
    const unsubscribe = flow.subscribe((s) =>
      states.push(s.currentStepId ?? 'null')
    );
    await flow.start();
    await flow.next();
    unsubscribe();
    await flow.back();
    expect(states).toContain('a');
    expect(states).toContain('b');
    // After unsubscribe, no 'a' from the back() call.
    const backAppended = states.slice(states.indexOf('b') + 1);
    expect(backAppended).toEqual([]);
    flow.destroy();
  });

  it('drives full navigation lifecycle', async () => {
    const events: CheckoutEvent[] = [];
    const flow = new CheckoutFlow({
      steps: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      onCreateSession: stubSession,
      onEvent: (e) => events.push(e),
    });
    await flow.start();
    await flow.next();
    await flow.next();
    await flow.next();
    expect(events.map((e) => e.type)).toContain('flow.completed');
    flow.destroy();
  });

  it('drives session lifecycle: create → update → recreate → markExpired', async () => {
    const onCreateSession = vi.fn(() => Promise.resolve(sessionResponse()));
    const onUpdateSession = vi.fn(() =>
      Promise.resolve(sessionResponse('cs_test_updated'))
    );
    const flow = new CheckoutFlow({
      steps: [{ id: 'a' }],
      onCreateSession,
      onUpdateSession,
    });
    const created = await flow.createSession();
    expect(created?.clientSecret).toContain('cs_test_abc');
    expect(flow.getSession()).toEqual(created);
    const updated = await flow.updateSession({ metadata: { note: 'x' } });
    expect(updated?.clientSecret).toContain('cs_test_updated');
    flow.markExpired();
    expect(flow.getSession()).toBeNull();
    flow.destroy();
  });

  it('supports setCart with debouncing', async () => {
    vi.useFakeTimers();
    const onUpdateSession = vi.fn(() =>
      Promise.resolve(sessionResponse('cs_test_updated'))
    );
    const flow = new CheckoutFlow({
      steps: [{ id: 'a' }],
      onCreateSession: stubSession,
      onUpdateSession,
      cartDebounceMs: 100,
    });
    await flow.createSession();
    const cart: CheckoutItem[] = [{ name: 'A', amount: 10 }];
    flow.setCart(cart);
    flow.setCart([...cart, { name: 'B', amount: 5 }]);
    await vi.advanceTimersByTimeAsync(150);
    expect(onUpdateSession).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
    flow.destroy();
  });

  it('persists and resumes via a storage adapter', async () => {
    globalThis.sessionStorage.clear();
    const storage = createSessionStorageAdapter();
    const first = new CheckoutFlow({
      steps: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      onCreateSession: stubSession,
      storage,
      storageKey: 'user-x',
      storageSaveDebounceMs: 0,
    });
    await first.start();
    await first.next();
    await new Promise((r) => setTimeout(r, 10));
    first.destroy();

    const second = new CheckoutFlow({
      steps: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      onCreateSession: stubSession,
      storage,
      storageKey: 'user-x',
    });
    await second.start();
    expect(second.getState().currentStepId).toBe('b');
    second.destroy();
    globalThis.sessionStorage.clear();
  });

  it('emits typed error events for session and storage failures', async () => {
    const events: CheckoutEvent[] = [];
    const flow = new CheckoutFlow({
      steps: [{ id: 'a' }],
      onCreateSession: () => Promise.reject(new Error('server down')),
      onEvent: (e) => events.push(e),
    });
    await flow.createSession();
    const err = events.find((e) => e.type === 'error');
    expect(err).toMatchObject({
      type: 'error',
      source: 'session.create',
    });
    flow.destroy();
  });

  it('stores integrator-owned metadata via setIntegratorState', () => {
    const flow = new CheckoutFlow<{ tag: string }>({
      steps: [{ id: 'a' }],
      onCreateSession: stubSession,
      initialState: { tag: 'initial' },
    });
    expect(flow.getIntegratorState().tag).toBe('initial');
    flow.setIntegratorState(() => ({ tag: 'updated' }));
    expect(flow.getIntegratorState().tag).toBe('updated');
    flow.destroy();
  });

  it('delegates goTo/complete/hydrate/reset/clearState/recreate/syncCart to the core', async () => {
    const events: CheckoutEvent[] = [];
    const flow = new CheckoutFlow({
      steps: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      onCreateSession: stubSession,
      onEvent: (e) => events.push(e),
    });

    await flow.start();
    await flow.goTo('c');
    expect(flow.getState().currentStepId).toBe('c');

    flow.hydrate({
      currentStepId: 'b',
      completedStepIds: ['a'],
      cartSnapshot: [],
      sessionId: null,
      sessionStatus: 'idle',
      metadata: {},
      schemaVersion: 1,
    });
    expect(flow.getState().currentStepId).toBe('b');

    flow.reset();
    expect(flow.getState().currentStepId).toBeNull();

    await flow.start();
    const created = await flow.createSession();
    expect(created?.clientSecret).toContain('cs_test_abc');
    const recreated = await flow.recreate();
    expect(recreated?.clientSecret).toBeDefined();
    expect(events.find((e) => e.type === 'session.recreated')).toBeDefined();

    const syncResult = await flow.syncCart([{ name: 'X', amount: 1 }]);
    expect(syncResult).toBeDefined();

    flow.complete();
    expect(events.find((e) => e.type === 'flow.completed')).toBeDefined();

    await flow.clearState();
    expect(flow.getState().currentStepId).toBeNull();
    flow.destroy();
  });

  it('destroy releases listeners and pending timers', async () => {
    vi.useFakeTimers();
    const onUpdateSession = vi.fn(() =>
      Promise.resolve(sessionResponse('cs_test_updated'))
    );
    const storage = createSessionStorageAdapter();
    globalThis.sessionStorage.clear();
    const flow = new CheckoutFlow({
      steps: [{ id: 'a' }],
      onCreateSession: stubSession,
      onUpdateSession,
      cartDebounceMs: 300,
      storage,
      storageKey: 'user-d',
      storageSaveDebounceMs: 300,
    });
    await flow.createSession();
    flow.setCart([{ name: 'A', amount: 10 }]);
    flow.destroy();
    await vi.advanceTimersByTimeAsync(1000);
    expect(onUpdateSession).not.toHaveBeenCalled();
    vi.useRealTimers();
    globalThis.sessionStorage.clear();
  });
});
