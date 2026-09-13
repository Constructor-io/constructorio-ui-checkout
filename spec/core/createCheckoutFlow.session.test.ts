import { createCheckoutFlow } from '@src/core/createCheckoutFlow';
import type { CheckoutEvent, CheckoutFlowConfig } from '@src/core/types';
import type { CheckoutItem, CheckoutSessionResponse } from '@src/types';

const sessionResponse = (
  id = 'cs_test_abc',
  publishableKey = 'pk_test'
): CheckoutSessionResponse => ({
  clientSecret: `${id}_secret_xyz`,
  publishableKey,
});

const record = (): {
  events: CheckoutEvent[];
  onEvent: (e: CheckoutEvent) => void;
} => {
  const events: CheckoutEvent[] = [];
  return { events, onEvent: (e) => events.push(e) };
};

describe('createCheckoutFlow: createSession', () => {
  it('calls onCreateSession and stores the session', async () => {
    const onCreateSession = vi.fn(() => Promise.resolve(sessionResponse()));
    const flow = createCheckoutFlow({
      steps: [{ id: 'a' }],
      onCreateSession,
    });
    const session = await flow.createSession();
    expect(session?.clientSecret).toBe('cs_test_abc_secret_xyz');
    expect(flow.getSession()).toEqual(sessionResponse());
    expect(flow.getState().sessionStatus).toBe('active');
    expect(flow.getState().sessionId).toBe('cs_test_abc');
  });

  it('emits session.created with only the session id (no secret)', async () => {
    const { events, onEvent } = record();
    const flow = createCheckoutFlow({
      steps: [{ id: 'a' }],
      onCreateSession: () => Promise.resolve(sessionResponse()),
      onEvent,
    });
    await flow.createSession();
    const evt = events.find((e) => e.type === 'session.created');
    expect(evt).toMatchObject({
      type: 'session.created',
      sessionId: 'cs_test_abc',
    });
    const serialized = JSON.stringify(evt);
    expect(serialized).not.toContain('secret');
    expect(serialized).not.toContain('xyz');
  });

  it('is idempotent when called twice', async () => {
    const onCreateSession = vi.fn(() => Promise.resolve(sessionResponse()));
    const flow = createCheckoutFlow({
      steps: [{ id: 'a' }],
      onCreateSession,
    });
    await flow.createSession();
    await flow.createSession();
    expect(onCreateSession).toHaveBeenCalledTimes(1);
  });

  it('emits error event when onCreateSession rejects', async () => {
    const { events, onEvent } = record();
    const flow = createCheckoutFlow({
      steps: [{ id: 'a' }],
      onCreateSession: () => Promise.reject(new Error('server down')),
      onEvent,
    });
    const result = await flow.createSession();
    expect(result).toBeNull();
    expect(flow.getState().sessionStatus).toBe('error');
    const err = events.find((e) => e.type === 'error');
    expect(err).toMatchObject({
      type: 'error',
      source: 'session.create',
    });
  });

  it('emits error when onCreateSession returns a bad shape', async () => {
    const { events, onEvent } = record();
    const flow = createCheckoutFlow({
      steps: [{ id: 'a' }],
      onCreateSession: () =>
        Promise.resolve({ nope: true } as unknown as CheckoutSessionResponse),
      onEvent,
    });
    await flow.createSession();
    const err = events.find((e) => e.type === 'error');
    expect(err).toMatchObject({ source: 'session.create' });
  });
});

describe('createCheckoutFlow: updateSession', () => {
  const makeFlow = (
    handlers: Partial<CheckoutFlowConfig> = {},
    recordEvents = true
  ) => {
    const { events, onEvent } = record();
    const flow = createCheckoutFlow({
      steps: [{ id: 'a' }],
      onCreateSession: () => Promise.resolve(sessionResponse()),
      onUpdateSession: () =>
        Promise.resolve(sessionResponse('cs_test_updated')),
      onEvent: recordEvents ? onEvent : undefined,
      ...handlers,
    });
    return { flow, events };
  };

  it('emits error when called without an active session', async () => {
    const { flow, events } = makeFlow();
    await flow.updateSession({ items: [] });
    const err = events.find((e) => e.type === 'error');
    expect(err).toMatchObject({ source: 'session.update' });
  });

  it('emits error when onUpdateSession is not configured', async () => {
    const { flow, events } = makeFlow({ onUpdateSession: undefined });
    await flow.createSession();
    await flow.updateSession({ items: [] });
    const err = events.find((e) => e.type === 'error');
    expect(err).toMatchObject({ source: 'session.update' });
  });

  it('emits session.updated with diff and reason', async () => {
    const beforeItems: CheckoutItem[] = [
      { name: 'A', amount: 10, quantity: 1 },
    ];
    const afterItems: CheckoutItem[] = [
      { name: 'A', amount: 10, quantity: 1 },
      { name: 'B', amount: 5, quantity: 2 },
    ];
    const { flow, events } = makeFlow({
      onUpdateSession: () =>
        Promise.resolve(sessionResponse('cs_test_updated')),
    });
    await flow.createSession();
    flow.hydrate({
      currentStepId: 'a',
      completedStepIds: [],
      cartSnapshot: beforeItems,
      sessionId: 'cs_test_abc',
      sessionStatus: 'active',
      metadata: {},
      schemaVersion: 1,
    });
    await flow.updateSession({ items: afterItems, reason: 'items' });
    const updated = events.find((e) => e.type === 'session.updated');
    expect(updated).toMatchObject({
      type: 'session.updated',
      reason: 'items',
      diff: {
        added: [{ name: 'B' }],
        totalChange: { from: 10, to: 20 },
      },
    });
  });

  it('serializes updates so out-of-order responses cannot corrupt state', async () => {
    const callOrder: string[] = [];
    const resolveOrder: string[] = [];
    const controllers: Array<() => void> = [];
    const onUpdateSession = vi.fn(
      (patch: { metadata?: Record<string, unknown> }) => {
        const tag = String(patch.metadata?.tag);
        callOrder.push(tag);
        return new Promise<CheckoutSessionResponse>((resolve) => {
          controllers.push(() => {
            resolveOrder.push(tag);
            resolve(sessionResponse(`cs_${tag}`));
          });
        });
      }
    );
    const flow = createCheckoutFlow({
      steps: [{ id: 'a' }],
      onCreateSession: () => Promise.resolve(sessionResponse()),
      onUpdateSession,
    });
    await flow.createSession();

    const p1 = flow.updateSession({ metadata: { tag: 'first' } });
    const p2 = flow.updateSession({ metadata: { tag: 'second' } });
    const p3 = flow.updateSession({ metadata: { tag: 'third' } });

    // Only the first should have started before we release it.
    expect(callOrder).toEqual(['first']);
    controllers[0]();
    await p1;
    expect(callOrder).toEqual(['first', 'second']);
    controllers[1]();
    await p2;
    expect(callOrder).toEqual(['first', 'second', 'third']);
    controllers[2]();
    await p3;
    expect(resolveOrder).toEqual(['first', 'second', 'third']);
  });

  it('continues serving queued updates when one fails', async () => {
    let call = 0;
    const flow = createCheckoutFlow({
      steps: [{ id: 'a' }],
      onCreateSession: () => Promise.resolve(sessionResponse()),
      onUpdateSession: () => {
        call += 1;
        if (call === 1) return Promise.reject(new Error('temporary'));
        return Promise.resolve(sessionResponse('cs_test_ok'));
      },
    });
    await flow.createSession();
    const [r1, r2] = await Promise.all([
      flow.updateSession({ metadata: { i: 1 } }),
      flow.updateSession({ metadata: { i: 2 } }),
    ]);
    expect(r1).toBeNull();
    expect(r2?.clientSecret).toContain('cs_test_ok');
  });
});

describe('createCheckoutFlow: markExpired', () => {
  it('clears the session, sets status expired, and emits event', async () => {
    const { events, onEvent } = record();
    const flow = createCheckoutFlow({
      steps: [{ id: 'a' }],
      onCreateSession: () => Promise.resolve(sessionResponse()),
      onEvent,
    });
    await flow.createSession();
    flow.markExpired();
    expect(flow.getSession()).toBeNull();
    expect(flow.getState().sessionStatus).toBe('expired');
    expect(events.find((e) => e.type === 'session.expired')).toMatchObject({
      sessionId: 'cs_test_abc',
    });
  });

  it('is a no-op when no session exists', () => {
    const flow = createCheckoutFlow({
      steps: [{ id: 'a' }],
      onCreateSession: () => Promise.resolve(sessionResponse()),
    });
    expect(() => flow.markExpired()).not.toThrow();
    expect(flow.getState().sessionStatus).toBe('idle');
  });
});

describe('createCheckoutFlow: recreate', () => {
  it('creates a fresh session and emits session.recreated', async () => {
    const responses = [
      sessionResponse('cs_test_old'),
      sessionResponse('cs_test_new'),
    ];
    let call = 0;
    const { events, onEvent } = record();
    const flow = createCheckoutFlow({
      steps: [{ id: 'a' }],
      onCreateSession: () => {
        const r = responses[call];
        call += 1;
        return Promise.resolve(r);
      },
      onEvent,
    });
    await flow.createSession();
    const result = await flow.recreate();
    expect(result?.clientSecret).toContain('cs_test_new');
    expect(flow.getState().sessionId).toBe('cs_test_new');
    expect(events.find((e) => e.type === 'session.recreated')).toMatchObject({
      oldSessionId: 'cs_test_old',
      newSessionId: 'cs_test_new',
    });
  });
});
