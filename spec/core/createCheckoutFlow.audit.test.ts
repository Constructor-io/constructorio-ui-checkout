import { createCheckoutFlow } from '@src/core/createCheckoutFlow';
import type { CheckoutFlowConfig, StorageAdapter } from '@src/core/types';
import type { CheckoutItem, CheckoutSessionResponse } from '@src/types';

const sessionResponse = (id = 'cs_test_abc'): CheckoutSessionResponse => ({
  clientSecret: `${id}_secret_xyz`,
  publishableKey: 'pk_test',
});

const stubSession = () => Promise.resolve(sessionResponse());

const minimalConfig = (
  overrides: Partial<CheckoutFlowConfig> = {}
): CheckoutFlowConfig => ({
  steps: [{ id: 'a' }, { id: 'b' }],
  onCreateSession: stubSession,
  ...overrides,
});

describe('regression: concurrent createSession must coalesce', () => {
  it('two rapid calls fire onCreateSession exactly once', async () => {
    let calls = 0;
    const flow = createCheckoutFlow(
      minimalConfig({
        onCreateSession: () => {
          calls += 1;
          return new Promise<CheckoutSessionResponse>((resolve) => {
            setTimeout(() => resolve(sessionResponse()), 20);
          });
        },
      })
    );
    const [a, b] = await Promise.all([
      flow.createSession(),
      flow.createSession(),
    ]);
    expect(calls).toBe(1);
    expect(a).toBe(b);
    flow.destroy();
  });

  it('calls after the first resolves reuse the cached session', async () => {
    let calls = 0;
    const flow = createCheckoutFlow(
      minimalConfig({
        onCreateSession: () => {
          calls += 1;
          return Promise.resolve(sessionResponse());
        },
      })
    );
    await flow.createSession();
    await flow.createSession();
    await flow.createSession();
    expect(calls).toBe(1);
    flow.destroy();
  });
});

describe('regression: session queue drains on lifecycle events', () => {
  const makeFlowWithSlowUpdate = () => {
    let resolvePending: ((v: CheckoutSessionResponse) => void) | null = null;
    const onUpdateSession = () =>
      new Promise<CheckoutSessionResponse>((resolve) => {
        resolvePending = resolve;
      });
    const flow = createCheckoutFlow({
      steps: [{ id: 'a' }],
      onCreateSession: stubSession,
      onUpdateSession,
    });
    return {
      flow,
      resolvePending: () => resolvePending?.(sessionResponse('cs_test_ok')),
    };
  };

  it('destroy resolves all pending updateSession promises with null', async () => {
    const { flow } = makeFlowWithSlowUpdate();
    await flow.createSession();
    const p1 = flow.updateSession({ metadata: { i: 1 } });
    const p2 = flow.updateSession({ metadata: { i: 2 } });
    const p3 = flow.updateSession({ metadata: { i: 3 } });
    flow.destroy();
    // p2 and p3 were queued behind p1 (in-flight); they must resolve to null,
    // not hang forever. p1 is in flight — the fetch is still running.
    await expect(p2).resolves.toBeNull();
    await expect(p3).resolves.toBeNull();
    void p1;
  });

  it('markExpired drains queued updateSession promises', async () => {
    const { flow } = makeFlowWithSlowUpdate();
    await flow.createSession();
    const p1 = flow.updateSession({ metadata: { i: 1 } });
    const p2 = flow.updateSession({ metadata: { i: 2 } });
    flow.markExpired();
    await expect(p2).resolves.toBeNull();
    void p1;
    flow.destroy();
  });

  it('reset drains queued updateSession promises', async () => {
    const { flow } = makeFlowWithSlowUpdate();
    await flow.createSession();
    const p1 = flow.updateSession({ metadata: { i: 1 } });
    const p2 = flow.updateSession({ metadata: { i: 2 } });
    flow.reset();
    await expect(p2).resolves.toBeNull();
    void p1;
    flow.destroy();
  });
});

describe('regression: setCart content equality prevents debounce-reset death', () => {
  it('does not reset the debounce timer when content is unchanged', async () => {
    vi.useFakeTimers();
    const onUpdateSession = vi.fn(() =>
      Promise.resolve(sessionResponse('cs_test_ok'))
    );
    const flow = createCheckoutFlow({
      steps: [{ id: 'a' }],
      onCreateSession: stubSession,
      onUpdateSession,
      cartDebounceMs: 200,
    });
    await flow.createSession();

    const cart: CheckoutItem[] = [{ name: 'Widget', amount: 10, quantity: 1 }];
    // Simulate rerenders passing a new-reference-same-content array
    flow.setCart([...cart]);
    await vi.advanceTimersByTimeAsync(100);
    flow.setCart([...cart]);
    await vi.advanceTimersByTimeAsync(100);
    flow.setCart([...cart]);
    await vi.advanceTimersByTimeAsync(100);
    // Total 300ms elapsed. Without content-equality, debounce would reset on
    // every setCart and never fire. With the fix, the first setCart fires
    // after 200ms and subsequent same-content calls no-op.
    expect(onUpdateSession).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
    flow.destroy();
  });

  it('fires updateSession when content actually changes', async () => {
    vi.useFakeTimers();
    const onUpdateSession = vi.fn(() =>
      Promise.resolve(sessionResponse('cs_test_ok'))
    );
    const flow = createCheckoutFlow({
      steps: [{ id: 'a' }],
      onCreateSession: stubSession,
      onUpdateSession,
      cartDebounceMs: 100,
    });
    await flow.createSession();
    flow.setCart([{ name: 'A', amount: 10 }]);
    await vi.advanceTimersByTimeAsync(150);
    flow.setCart([
      { name: 'A', amount: 10 },
      { name: 'B', amount: 5 },
    ]);
    await vi.advanceTimersByTimeAsync(150);
    expect(onUpdateSession).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
    flow.destroy();
  });
});

describe('regression: storage save race is serialized', () => {
  it('coalesces rapid state changes into the latest save', async () => {
    const inFlightResolvers: Array<() => void> = [];
    const saveCalls: number[] = [];
    let saveCounter = 0;
    const adapter: StorageAdapter = {
      load: () => Promise.resolve(null),
      save: (_, state) => {
        saveCounter += 1;
        saveCalls.push(state.completedStepIds.length);
        return new Promise<void>((resolve) => {
          if (saveCounter === 1) {
            inFlightResolvers.push(resolve);
          } else {
            resolve();
          }
        });
      },
      clear: () => Promise.resolve(),
    };
    const flow = createCheckoutFlow({
      steps: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      onCreateSession: stubSession,
      storage: adapter,
      storageKey: 'race-1',
      storageSaveDebounceMs: 0,
    });
    await flow.start();
    // saveCalls now [0] and in flight
    await new Promise((r) => setTimeout(r, 10));
    // Now do several rapid state changes while first save is in flight
    await flow.next();
    await flow.next();
    await new Promise((r) => setTimeout(r, 10));
    // In flight is still pending; the two setState should coalesce into one pending
    expect(saveCalls.length).toBe(1);
    // Release the in-flight save
    inFlightResolvers[0]?.();
    await new Promise((r) => setTimeout(r, 20));
    // Should have exactly ONE follow-up save with the LATEST state
    expect(saveCalls.length).toBe(2);
    expect(saveCalls.at(-1)).toBe(2);
    flow.destroy();
  });

  it('restores lastSavedSerialized on save failure so retry re-attempts', async () => {
    let failNext = true;
    const attempts: number[] = [];
    const adapter: StorageAdapter = {
      load: () => Promise.resolve(null),
      save: () => {
        attempts.push(1);
        if (failNext) {
          failNext = false;
          return Promise.reject(new Error('backend down'));
        }
        return Promise.resolve();
      },
      clear: () => Promise.resolve(),
    };
    const flow = createCheckoutFlow({
      steps: [{ id: 'a' }, { id: 'b' }],
      onCreateSession: stubSession,
      storage: adapter,
      storageKey: 'fail-1',
      storageSaveDebounceMs: 0,
    });
    await flow.start();
    await new Promise((r) => setTimeout(r, 20));
    // First save failed. If lastSavedSerialized was left as the failed value,
    // a subsequent no-op state change (same content) would skip the save.
    // Instead we advance to force a state change and confirm a retry.
    await flow.next();
    await new Promise((r) => setTimeout(r, 20));
    expect(attempts.length).toBeGreaterThan(1);
    flow.destroy();
  });
});

describe('regression: goTo(current step) is a no-op', () => {
  it('does not emit step.exited/step.entered when target equals current', async () => {
    const events: string[] = [];
    const flow = createCheckoutFlow(
      minimalConfig({
        onEvent: (e) => events.push(e.type),
      })
    );
    await flow.start();
    events.length = 0;
    await flow.goTo('a');
    expect(events).not.toContain('step.entered');
    expect(events).not.toContain('step.exited');
    flow.destroy();
  });
});
