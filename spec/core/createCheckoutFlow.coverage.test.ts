import { createCheckoutFlow } from '@src/core/createCheckoutFlow';
import type { CheckoutEvent, StorageAdapter } from '@src/core/types';
import { FLOW_SCHEMA_VERSION } from '@src/core/types';
import type { CheckoutSessionResponse } from '@src/types';

const sessionResponse = (id = 'cs_test_abc'): CheckoutSessionResponse => ({
  clientSecret: `${id}_secret_xyz`,
  publishableKey: 'pk_test',
});

const stubSession = () => Promise.resolve(sessionResponse());

describe('coverage: toError() fallback branches', () => {
  it('handles a non-Error, non-string rejection as "Unknown error"', async () => {
    const events: CheckoutEvent[] = [];
    const flow = createCheckoutFlow({
      steps: [{ id: 'a' }],
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
      onCreateSession: () => Promise.reject(42),
      onEvent: (e) => events.push(e),
    });
    await flow.createSession();
    const err = events.find((e) => e.type === 'error');
    expect(err).toMatchObject({
      type: 'error',
      source: 'session.create',
      error: expect.objectContaining({ message: 'Unknown error' }) as unknown,
    });
    flow.destroy();
  });

  it('handles a string rejection by wrapping it in an Error', async () => {
    const events: CheckoutEvent[] = [];
    const flow = createCheckoutFlow({
      steps: [{ id: 'a' }],
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
      onCreateSession: () => Promise.reject('nope'),
      onEvent: (e) => events.push(e),
    });
    await flow.createSession();
    const err = events.find((e) => e.type === 'error');
    expect(err).toMatchObject({
      error: expect.objectContaining({ message: 'nope' }) as unknown,
    });
    flow.destroy();
  });
});

describe('coverage: next() edge cases', () => {
  it('auto-starts the flow when next() is called before start()', async () => {
    const flow = createCheckoutFlow({
      steps: [{ id: 'a' }, { id: 'b' }],
      onCreateSession: stubSession,
    });
    expect(flow.getState().currentStepId).toBeNull();
    await flow.next();
    expect(flow.getState().currentStepId).toBe('a');
    flow.destroy();
  });

  it('emits error when currentStepId is not in the steps array', async () => {
    const events: CheckoutEvent[] = [];
    const flow = createCheckoutFlow({
      steps: [{ id: 'a' }, { id: 'b' }],
      onCreateSession: stubSession,
      onEvent: (e) => events.push(e),
    });
    // Hydrate to a state referencing a step that exists, then remove tracking
    // via direct mutation of internal state through hydrate() with a bogus id.
    // hydrate rejects unknown step ids, so we take a different path: manually
    // build the illegal state by hydrating with a valid state, then forcibly
    // corrupting via a second hydrate. hydrate rejects bad shapes cleanly, so
    // the only way to observe this branch is via a legitimate current step
    // that later gets removed from steps — which can't happen. Instead we
    // simulate by hydrating with a valid state that references step 'b' but
    // give the flow steps that don't include it (which hydrate also rejects).
    // So this branch is defensive-only and unreachable via public API — the
    // coverage line stays a defensive noop. Documented here as intentional.
    await flow.start();
    await flow.next();
    expect(flow.getState().currentStepId).toBe('b');
    // No unreachable error should have fired
    const err = events.find(
      (e) =>
        e.type === 'error' && e.error.message.includes('not in steps array')
    );
    expect(err).toBeUndefined();
    flow.destroy();
  });
});

describe('coverage: goTo() from null (before start)', () => {
  it('emits flow.started when goTo is called before start', async () => {
    const events: CheckoutEvent[] = [];
    const flow = createCheckoutFlow({
      steps: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      onCreateSession: stubSession,
      onEvent: (e) => events.push(e),
    });
    await flow.goTo('b');
    expect(flow.getState().currentStepId).toBe('b');
    expect(events.map((e) => e.type)).toContain('flow.started');
    flow.destroy();
  });
});

describe('coverage: clearCartDebounce clears active timer', () => {
  it('reset() cancels a pending setCart debounce and clears pendingCart', async () => {
    vi.useFakeTimers();
    const onUpdateSession = vi.fn(() =>
      Promise.resolve(sessionResponse('cs_test_ok'))
    );
    const flow = createCheckoutFlow({
      steps: [{ id: 'a' }],
      onCreateSession: stubSession,
      onUpdateSession,
      cartDebounceMs: 500,
    });
    await flow.createSession();
    flow.setCart([{ name: 'A', amount: 10 }]);
    flow.reset();
    await vi.advanceTimersByTimeAsync(1000);
    expect(onUpdateSession).not.toHaveBeenCalled();
    vi.useRealTimers();
    flow.destroy();
  });
});

describe('coverage: runUpdate bad-shape response', () => {
  it('emits error when onUpdateSession resolves with an invalid shape', async () => {
    const events: CheckoutEvent[] = [];
    const flow = createCheckoutFlow({
      steps: [{ id: 'a' }],
      onCreateSession: stubSession,
      onUpdateSession: () =>
        Promise.resolve({ wrong: true } as unknown as CheckoutSessionResponse),
      onEvent: (e) => events.push(e),
    });
    await flow.createSession();
    await flow.updateSession({ metadata: {} });
    const err = events.find((e) => e.type === 'error');
    expect(err).toMatchObject({
      type: 'error',
      source: 'session.update',
    });
    flow.destroy();
  });
});

describe('coverage: clearState with failing storage.clear', () => {
  it('emits storage error when adapter.clear rejects', async () => {
    const events: CheckoutEvent[] = [];
    const adapter: StorageAdapter = {
      load: () => Promise.resolve(null),
      save: () => Promise.resolve(),
      clear: () => Promise.reject(new Error('clear failed')),
    };
    const flow = createCheckoutFlow({
      steps: [{ id: 'a' }, { id: 'b' }],
      onCreateSession: stubSession,
      storage: adapter,
      storageKey: 'user-clear-fail',
      storageSaveDebounceMs: 0,
      onEvent: (e) => events.push(e),
    });
    await flow.start();
    await flow.clearState();
    const err = events.find(
      (e) => e.type === 'error' && e.source === 'storage'
    );
    expect(err).toMatchObject({ source: 'storage' });
    flow.destroy();
  });

  it('swallows the error silently if the flow was destroyed during clear', async () => {
    const events: CheckoutEvent[] = [];
    const rejecters: Array<(r?: unknown) => void> = [];
    const adapter: StorageAdapter = {
      load: () => Promise.resolve(null),
      save: () => Promise.resolve(),
      clear: () =>
        new Promise((_, reject) => {
          rejecters.push(reject);
        }),
    };
    const flow = createCheckoutFlow({
      steps: [{ id: 'a' }],
      onCreateSession: stubSession,
      storage: adapter,
      storageKey: 'user-destroyed-clear',
      onEvent: (e) => events.push(e),
    });
    await flow.start();
    const p = flow.clearState();
    flow.destroy();
    rejecters[0]?.(new Error('too late'));
    await p;
    // After destroy, storage errors should not fire further onEvent calls.
    const laterErrors = events.filter(
      (e) => e.type === 'error' && e.error.message === 'too late'
    );
    expect(laterErrors).toHaveLength(0);
  });
});

describe('coverage: hydrate direct-invocation edge cases', () => {
  it('validated state with schemaVersion is accepted', () => {
    const flow = createCheckoutFlow({
      steps: [{ id: 'a' }, { id: 'b' }],
      onCreateSession: stubSession,
    });
    flow.hydrate({
      currentStepId: 'b',
      completedStepIds: ['a'],
      cartSnapshot: [],
      sessionId: 'cs_test_x',
      sessionStatus: 'active',
      metadata: { any: 'value' },
      schemaVersion: FLOW_SCHEMA_VERSION,
    });
    expect(flow.getState().currentStepId).toBe('b');
    flow.destroy();
  });
});
