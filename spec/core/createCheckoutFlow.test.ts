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
  provider: 'stripe',
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

describe(`${createCheckoutFlow.name}: client`, () => {
  describe('construction', () => {
    it('throws when steps is empty', () => {
      expect(() =>
        createCheckoutFlow({
          provider: 'stripe',
          steps: [],
          onCreateSession: stubSession,
        })
      ).toThrow(/non-empty array/);
    });

    it('throws when a step has no id', () => {
      expect(() =>
        createCheckoutFlow({
          provider: 'stripe',
          // @ts-expect-error intentional shape violation
          steps: [{}],
          onCreateSession: stubSession,
        })
      ).toThrow(/non-empty `id`/);
    });

    it('throws on duplicate step ids', () => {
      expect(() =>
        createCheckoutFlow({
          provider: 'stripe',
          steps: [{ id: 'a' }, { id: 'a' }],
          onCreateSession: stubSession,
        })
      ).toThrow(/duplicate step id/);
    });

    it('throws when onCreateSession is missing', () => {
      expect(() =>
        // @ts-expect-error intentional shape violation
        createCheckoutFlow({ provider: 'stripe', steps: [{ id: 'a' }] })
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

  describe('navigation wiring', () => {
    it('start() emits flow.started, state.changed, step.entered in order', async () => {
      const { events, onEvent } = recordEvents();
      const flow = createCheckoutFlow(minimalConfig({ onEvent }));
      await flow.start();
      expect(flow.getState().currentStepId).toBe('a');
      expect(events.map((e) => e.type)).toEqual([
        'flow.started',
        'state.changed',
        'step.entered',
      ]);
    });

    it('emits flow.completed after next() past the last step', async () => {
      const { events, onEvent } = recordEvents();
      const flow = createCheckoutFlow(minimalConfig({ onEvent }));
      await flow.start();
      await flow.next();
      await flow.next();
      await flow.next();
      expect(events.map((e) => e.type)).toContain('flow.completed');
    });
  });

  describe('hydrate & validate', () => {
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

    it('rejects state with wrong schemaVersion and emits storage error', () => {
      const { events, onEvent } = recordEvents();
      const flow = createCheckoutFlow(minimalConfig({ onEvent }));
      flow.hydrate({ ...validState(), schemaVersion: 99 as unknown as 1 });
      expect(flow.getState().currentStepId).toBeNull();
      expect(events.find((e) => e.type === 'error')).toMatchObject({
        source: 'storage',
      });
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

    it('downgrades active/creating sessionStatus to idle on hydrate (recovery)', () => {
      const flow = createCheckoutFlow(minimalConfig());
      flow.hydrate(validState());
      expect(flow.getState().sessionStatus).toBe('idle');
      expect(flow.getState().sessionId).toBeNull();
    });
  });

  describe('subscribe wiring', () => {
    it('notifies subscribers on state changes and unsubscribes cleanly', async () => {
      const flow = createCheckoutFlow(minimalConfig());
      const states: FlowState[] = [];
      const unsubscribe = flow.subscribe((s) => states.push(s));
      await flow.start();
      await flow.next();
      unsubscribe();
      await flow.next();
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
      await expect(flow.start()).resolves.toBeUndefined();
    });
  });

  describe('integrator state', () => {
    it('stores and updates integrator-owned metadata via setIntegratorState', () => {
      const flow = createCheckoutFlow(
        minimalConfig({ initialState: { counter: 0 } })
      );
      expect((flow.getIntegratorState() as { counter: number }).counter).toBe(
        0
      );
      flow.setIntegratorState(
        (prev) =>
          ({
            counter: (prev as { counter: number }).counter + 1,
          }) as unknown
      );
      expect((flow.getIntegratorState() as { counter: number }).counter).toBe(
        1
      );
    });
  });

  describe('destroy', () => {
    it('silences further onEvent calls after destroy', async () => {
      const { events, onEvent } = recordEvents();
      const flow = createCheckoutFlow(minimalConfig({ onEvent }));
      flow.destroy();
      await flow.start();
      expect(events.filter((e) => e.type === 'error')).toHaveLength(0);
    });
  });
});
