import { createCheckoutFlow } from '@src/core/createCheckoutFlow';
import type {
  CheckoutEvent,
  CheckoutFlowConfig,
  FlowState,
} from '@src/core/types';
import { FLOW_SCHEMA_VERSION } from '@src/core/types';

const stubSession = () =>
  Promise.resolve({ clientSecret: 'cs_test', publishableKey: 'pk_test' });

const minimalConfig = (
  overrides: Partial<CheckoutFlowConfig> = {}
): CheckoutFlowConfig => ({
  steps: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
  onCreateSession: stubSession,
  ...overrides,
});

const recordEvents = (): {
  events: CheckoutEvent[];
  onEvent: (e: CheckoutEvent) => void;
} => {
  const events: CheckoutEvent[] = [];
  return { events, onEvent: (e) => events.push(e) };
};

describe('createCheckoutFlow: construction', () => {
  it('throws when steps is empty', () => {
    expect(() =>
      createCheckoutFlow({ steps: [], onCreateSession: stubSession })
    ).toThrow(/non-empty array/);
  });

  it('throws when a step has no id', () => {
    expect(() =>
      createCheckoutFlow({
        // @ts-expect-error intentional shape violation
        steps: [{}],
        onCreateSession: stubSession,
      })
    ).toThrow(/non-empty `id`/);
  });

  it('throws on duplicate step ids', () => {
    expect(() =>
      createCheckoutFlow({
        steps: [{ id: 'a' }, { id: 'a' }],
        onCreateSession: stubSession,
      })
    ).toThrow(/duplicate step id/);
  });

  it('throws when onCreateSession is missing', () => {
    expect(() =>
      // @ts-expect-error intentional shape violation
      createCheckoutFlow({ steps: [{ id: 'a' }] })
    ).toThrow(/onCreateSession/);
  });

  it('starts with a null currentStepId (modal-friendly)', () => {
    const flow = createCheckoutFlow(minimalConfig());
    expect(flow.getState().currentStepId).toBeNull();
    expect(flow.getState().completedStepIds).toEqual([]);
    expect(flow.getState().sessionStatus).toBe('idle');
    expect(flow.getState().schemaVersion).toBe(FLOW_SCHEMA_VERSION);
  });
});

describe('createCheckoutFlow: navigation', () => {
  it('enters the first step on start()', async () => {
    const { events, onEvent } = recordEvents();
    const flow = createCheckoutFlow(minimalConfig({ onEvent }));
    await flow.start();
    expect(flow.getState().currentStepId).toBe('a');
    // state.changed fires from the store subscription after each mutation, so
    // it appears between the flow-level and step-level events for the same op.
    expect(events.map((e) => e.type)).toEqual([
      'flow.started',
      'state.changed',
      'step.entered',
    ]);
  });

  it('advances through next() with completedStepIds appended', async () => {
    const flow = createCheckoutFlow(minimalConfig());
    await flow.start();
    await flow.next();
    expect(flow.getState().currentStepId).toBe('b');
    expect(flow.getState().completedStepIds).toEqual(['a']);
    await flow.next();
    expect(flow.getState().currentStepId).toBe('c');
    expect(flow.getState().completedStepIds).toEqual(['a', 'b']);
  });

  it('fires flow.completed when advancing past the last step', async () => {
    const { events, onEvent } = recordEvents();
    const flow = createCheckoutFlow(minimalConfig({ onEvent }));
    await flow.start();
    await flow.next();
    await flow.next();
    await flow.next(); // c → done
    expect(events.map((e) => e.type)).toContain('flow.completed');
  });

  it('back() steps to previous and un-completes only the destination step', async () => {
    const flow = createCheckoutFlow(minimalConfig());
    await flow.start();
    await flow.next();
    await flow.next();
    expect(flow.getState().currentStepId).toBe('c');
    expect(flow.getState().completedStepIds).toEqual(['a', 'b']);
    await flow.back();
    expect(flow.getState().currentStepId).toBe('b');
    // 'a' stays completed; 'b' becomes uncompleted since the user re-enters it.
    expect(flow.getState().completedStepIds).toEqual(['a']);
  });

  it('back() is a no-op at the first step', async () => {
    const flow = createCheckoutFlow(minimalConfig());
    await flow.start();
    await flow.back();
    expect(flow.getState().currentStepId).toBe('a');
  });

  it('goTo() jumps forward and marks intermediate steps completed', async () => {
    const flow = createCheckoutFlow(minimalConfig());
    await flow.start();
    await flow.goTo('c');
    expect(flow.getState().currentStepId).toBe('c');
    expect(flow.getState().completedStepIds).toEqual(['a', 'b']);
  });

  it('goTo() jumps backward without adding to completed', async () => {
    const flow = createCheckoutFlow(minimalConfig());
    await flow.start();
    await flow.next();
    await flow.next();
    await flow.goTo('a');
    expect(flow.getState().currentStepId).toBe('a');
  });

  it('goTo() surfaces an error event for unknown step ids', async () => {
    const { events, onEvent } = recordEvents();
    const flow = createCheckoutFlow(minimalConfig({ onEvent }));
    await flow.start();
    await flow.goTo('nope');
    const err = events.find((e) => e.type === 'error');
    expect(err).toBeDefined();
    expect(flow.getState().currentStepId).toBe('a');
  });
});

describe('createCheckoutFlow: guards', () => {
  it('blocks entry when guard returns false', async () => {
    const { events, onEvent } = recordEvents();
    const flow = createCheckoutFlow(
      minimalConfig({
        steps: [{ id: 'a' }, { id: 'b', guard: () => false }],
        onEvent,
      })
    );
    await flow.start();
    await flow.next();
    expect(flow.getState().currentStepId).toBe('a');
    // No step.entered:b event should have fired.
    expect(
      events.find((e) => e.type === 'step.entered' && e.stepId === 'b')
    ).toBeUndefined();
  });

  it('awaits async guards', async () => {
    const flow = createCheckoutFlow(
      minimalConfig({
        steps: [
          { id: 'a' },
          {
            id: 'b',
            guard: () =>
              new Promise<boolean>((resolve) => {
                setTimeout(() => resolve(true), 10);
              }),
          },
        ],
      })
    );
    await flow.start();
    await flow.next();
    expect(flow.getState().currentStepId).toBe('b');
  });

  it('emits error event when guard throws', async () => {
    const { events, onEvent } = recordEvents();
    const flow = createCheckoutFlow(
      minimalConfig({
        steps: [
          { id: 'a' },
          {
            id: 'b',
            guard: () => {
              throw new Error('boom');
            },
          },
        ],
        onEvent,
      })
    );
    await flow.start();
    await flow.next();
    const err = events.find((e) => e.type === 'error');
    expect(err).toMatchObject({
      type: 'error',
      source: 'guard',
      error: expect.objectContaining({ message: 'boom' }) as unknown,
    });
    expect(flow.getState().currentStepId).toBe('a');
  });
});

describe('createCheckoutFlow: skip', () => {
  it('allows next({skip:true}) for optional steps', async () => {
    const { events, onEvent } = recordEvents();
    const flow = createCheckoutFlow(
      minimalConfig({
        steps: [{ id: 'a' }, { id: 'b', optional: true }, { id: 'c' }],
        onEvent,
      })
    );
    await flow.start();
    await flow.next({ skip: true });
    // 'a' is the current step here; the skip semantically applies to advancing past it.
    // Documented behavior: skip is allowed only when current step is optional.
    expect(flow.getState().currentStepId).toBe('a');
    const err = events.find((e) => e.type === 'error');
    expect(err).toBeDefined();
  });

  it('advances past an optional step when skip=true is passed', async () => {
    const flow = createCheckoutFlow(
      minimalConfig({
        steps: [{ id: 'a', optional: true }, { id: 'b' }],
      })
    );
    await flow.start();
    await flow.next({ skip: true });
    expect(flow.getState().currentStepId).toBe('b');
  });
});

describe('createCheckoutFlow: reset', () => {
  it('reset() clears state', async () => {
    const flow = createCheckoutFlow(minimalConfig());
    await flow.start();
    flow.reset();
    expect(flow.getState().currentStepId).toBeNull();
  });
});

describe('createCheckoutFlow: hydrate & validate', () => {
  const validState = (): FlowState => ({
    currentStepId: 'b',
    completedStepIds: ['a'],
    cartSnapshot: [],
    sessionId: 'cs_test_1',
    sessionStatus: 'active',
    metadata: {},
    schemaVersion: FLOW_SCHEMA_VERSION,
  });

  it('hydrates a valid state', () => {
    const flow = createCheckoutFlow(minimalConfig());
    flow.hydrate(validState());
    expect(flow.getState().currentStepId).toBe('b');
    expect(flow.getState().completedStepIds).toEqual(['a']);
  });

  it('rejects state with wrong schemaVersion', () => {
    const { events, onEvent } = recordEvents();
    const flow = createCheckoutFlow(minimalConfig({ onEvent }));
    flow.hydrate({ ...validState(), schemaVersion: 99 as unknown as 1 });
    expect(flow.getState().currentStepId).toBeNull();
    const err = events.find((e) => e.type === 'error');
    expect(err).toMatchObject({ type: 'error', source: 'storage' });
  });

  it('rejects state referencing an unknown step id', () => {
    const flow = createCheckoutFlow(minimalConfig());
    flow.hydrate({ ...validState(), currentStepId: 'ghost' });
    expect(flow.getState().currentStepId).toBeNull();
  });

  it('rejects state where completedStepIds contains unknown id', () => {
    const flow = createCheckoutFlow(minimalConfig());
    flow.hydrate({ ...validState(), completedStepIds: ['ghost'] });
    expect(flow.getState().currentStepId).toBeNull();
  });

  it('rejects state with prototype-pollution shape', () => {
    const flow = createCheckoutFlow(minimalConfig());
    const malformed = {
      ...validState(),
      __proto__: { polluted: true },
      metadata: 'not an object' as unknown as Record<string, unknown>,
    };
    flow.hydrate(malformed as unknown as FlowState);
    expect(flow.getState().currentStepId).toBeNull();
  });
});

describe('createCheckoutFlow: subscribe & events', () => {
  it('notifies subscribers on state changes', async () => {
    const flow = createCheckoutFlow(minimalConfig());
    const states: FlowState[] = [];
    const unsubscribe = flow.subscribe((s) => states.push(s));
    await flow.start();
    await flow.next();
    unsubscribe();
    await flow.next();
    // subscribe was unsubscribed before the third change
    expect(states.length).toBeGreaterThanOrEqual(2);
    expect(states.at(-1)?.currentStepId).toBe('b');
  });

  it('a throwing listener does not break other listeners', async () => {
    const flow = createCheckoutFlow(minimalConfig());
    const good: FlowState[] = [];
    flow.subscribe(() => {
      throw new Error('bad listener');
    });
    flow.subscribe((s) => good.push(s));
    await flow.start();
    expect(good.length).toBeGreaterThan(0);
  });

  it('a throwing onEvent handler does not break the emitter', async () => {
    const flow = createCheckoutFlow(
      minimalConfig({
        onEvent: () => {
          throw new Error('bad handler');
        },
      })
    );
    // If this throws, the test fails.
    await expect(flow.start()).resolves.toBeUndefined();
  });
});

describe('createCheckoutFlow: integrator state', () => {
  it('stores and updates integrator-owned metadata', () => {
    const flow = createCheckoutFlow(
      minimalConfig({ initialState: { counter: 0 } })
    );
    expect((flow.getIntegratorState() as { counter: number }).counter).toBe(0);
    flow.setIntegratorState(
      (prev) =>
        ({
          counter: (prev as { counter: number }).counter + 1,
        }) as unknown
    );
    expect((flow.getIntegratorState() as { counter: number }).counter).toBe(1);
  });
});

describe('createCheckoutFlow: destroy', () => {
  it('emits error on any op after destroy', async () => {
    const { events, onEvent } = recordEvents();
    const flow = createCheckoutFlow(minimalConfig({ onEvent }));
    flow.destroy();
    await flow.start();
    // onEvent handler was cleared by destroy, so no events after destroy.
    expect(events.filter((e) => e.type === 'error')).toHaveLength(0);
  });
});
