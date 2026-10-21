import { createCheckoutFlow } from '@src/core/createCheckoutFlow';
import type {
  CheckoutEvent,
  CheckoutFlowConfig,
  CheckoutFlowState,
  CheckoutRouterAdapter,
} from '@src/core/types';
import { DEFAULT_STORAGE_KEY, FLOW_SCHEMA_VERSION } from '@src/core/types';

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

    it('does not throw when onCreateSession is omitted', () => {
      expect(() =>
        createCheckoutFlow({ provider: 'stripe', steps: [{ id: 'a' }] })
      ).not.toThrow();
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
    const validState = (): CheckoutFlowState => ({
      currentStepId: 'b',
      completedStepIds: ['a'],
      cartSnapshot: [],
      cartTotal: 0,
      currency: null,
      sessionId: 'cs_test_1',
      sessionStatus: 'active',
      paymentInProgress: false,
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
      const states: CheckoutFlowState[] = [];
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
      const good: CheckoutFlowState[] = [];
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

  describe('router back and forward', () => {
    const routedSteps = [
      { id: 'cart', path: '/cart' },
      { id: 'payment', path: '/payment' },
      { id: 'done', path: '/done' },
    ];

    const makeHistory = (withReplace = true) => {
      let current = '/cart';
      let listener: ((path: string) => void) | null = null;
      const push = vi.fn((path: string) => {
        current = path;
      });
      const replace = vi.fn((path: string) => {
        current = path;
      });
      const router: CheckoutRouterAdapter = {
        push,
        getCurrentPath: () => current,
        subscribe: (cb) => {
          listener = cb;
          return () => {
            listener = null;
          };
        },
        ...(withReplace ? { replace } : {}),
      };
      const browserNavigate = (path: string) => {
        current = path;
        listener?.(path);
      };
      return { router, push, replace, browserNavigate, url: () => current };
    };

    const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

    const startAtPayment = async (
      router: CheckoutRouterAdapter,
      steps: CheckoutFlowConfig['steps'] = routedSteps
    ) => {
      const { events, onEvent } = recordEvents();
      const flow = createCheckoutFlow(
        minimalConfig({ steps, router, onEvent })
      );
      await flow.start();
      await flow.next();
      expect(flow.getState().currentStepId).toBe('payment');
      return { flow, events };
    };

    it('puts the URL back on payment when back is clicked during a payment', async () => {
      const history = makeHistory();
      const { flow } = await startAtPayment(history.router);
      flow.setPaymentInProgress(true);
      const pushesBefore = history.push.mock.calls.length;

      history.browserNavigate('/cart');
      await settle();

      expect(flow.getState().currentStepId).toBe('payment');
      expect(history.replace).toHaveBeenCalledWith('/payment');
      expect(history.url()).toBe('/payment');
      expect(history.push.mock.calls.length).toBe(pushesBefore);
    });

    it('puts the URL back when a guard rejects a back click', async () => {
      const history = makeHistory();
      let cartOpen = true;
      const { flow, events } = await startAtPayment(history.router, [
        { id: 'cart', path: '/cart', guard: () => cartOpen },
        { id: 'payment', path: '/payment' },
        { id: 'done', path: '/done' },
      ]);
      cartOpen = false;

      history.browserNavigate('/cart');
      await settle();

      expect(flow.getState().currentStepId).toBe('payment');
      expect(history.replace).toHaveBeenCalledWith('/payment');
      expect(events).toContainEqual(
        expect.objectContaining({ type: 'error', source: 'guard' })
      );
    });

    it('does not touch the URL when the back click is allowed', async () => {
      const history = makeHistory();
      const { flow } = await startAtPayment(history.router);

      history.browserNavigate('/cart');
      await settle();

      expect(flow.getState().currentStepId).toBe('cart');
      expect(history.replace).not.toHaveBeenCalled();
      expect(history.url()).toBe('/cart');
    });

    it('leaves the URL alone when the adapter has no replace', async () => {
      const history = makeHistory(false);
      const { flow } = await startAtPayment(history.router);
      flow.setPaymentInProgress(true);

      expect(() => history.browserNavigate('/cart')).not.toThrow();
      await settle();

      expect(flow.getState().currentStepId).toBe('payment');
      expect(history.url()).toBe('/cart');
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

  describe('without onCreateSession (C2)', () => {
    const noSessionConfig = (overrides: Partial<CheckoutFlowConfig> = {}) =>
      minimalConfig({ onCreateSession: undefined, ...overrides });

    it('createSession resolves null and marks the session active', async () => {
      const { events, onEvent } = recordEvents();
      const flow = createCheckoutFlow(noSessionConfig({ onEvent }));
      await expect(flow.createSession()).resolves.toBeNull();
      expect(flow.getSession()).toBeNull();
      expect(flow.getState().sessionStatus).toBe('active');
      expect(flow.getState().sessionId).toBeNull();
      expect(
        events.filter(
          (e) => e.type === 'error' || e.type.startsWith('session.')
        )
      ).toHaveLength(0);
    });

    it('does not emit a state change when already active', async () => {
      const flow = createCheckoutFlow(noSessionConfig());
      await flow.createSession();
      const listener = vi.fn();
      flow.subscribe(listener);
      await flow.createSession();
      expect(listener).not.toHaveBeenCalled();
    });

    it('recreate behaves the same', async () => {
      const flow = createCheckoutFlow(noSessionConfig());
      await expect(flow.recreate()).resolves.toBeNull();
      expect(flow.getState().sessionStatus).toBe('active');
    });

    it('updateSession without onUpdateSession keeps the error', async () => {
      const { events, onEvent } = recordEvents();
      const flow = createCheckoutFlow(noSessionConfig({ onEvent }));
      await flow.createSession();
      await expect(flow.updateSession({ items: [] })).resolves.toBeNull();
      const error = events.find((e) => e.type === 'error');
      expect(error).toMatchObject({ source: 'session.update' });
    });
  });

  describe('paymentInProgress (C4)', () => {
    it('defaults to false', () => {
      const flow = createCheckoutFlow(minimalConfig());
      expect(flow.getState().paymentInProgress).toBe(false);
    });

    it('blocks back() and goTo() with a guard error, but next() still works', async () => {
      const { events, onEvent } = recordEvents();
      const flow = createCheckoutFlow(minimalConfig({ onEvent }));
      await flow.start();
      await flow.next();
      flow.setPaymentInProgress(true);
      expect(flow.getState().paymentInProgress).toBe(true);

      await flow.back();
      await flow.goTo('a');
      expect(flow.getState().currentStepId).toBe('b');
      const guardErrors = events.filter(
        (e) => e.type === 'error' && e.source === 'guard'
      );
      expect(guardErrors).toHaveLength(2);
      expect(guardErrors[0]).toMatchObject({
        error: new Error('navigation blocked: payment in progress'),
      });

      await flow.next();
      expect(flow.getState().currentStepId).toBe('c');
    });

    it('allows navigation again once cleared', async () => {
      const flow = createCheckoutFlow(minimalConfig());
      await flow.start();
      await flow.next();
      flow.setPaymentInProgress(true);
      flow.setPaymentInProgress(false);
      await flow.back();
      expect(flow.getState().currentStepId).toBe('a');
    });

    it('does not emit a state change when the value is unchanged', () => {
      const flow = createCheckoutFlow(minimalConfig());
      const listener = vi.fn();
      flow.subscribe(listener);
      flow.setPaymentInProgress(false);
      expect(listener).not.toHaveBeenCalled();
    });

    it('is a no-op after destroy', () => {
      const flow = createCheckoutFlow(minimalConfig());
      flow.destroy();
      flow.setPaymentInProgress(true);
      expect(flow.getState().paymentInProgress).toBe(false);
    });

    it('hydrate forces it to false', () => {
      const flow = createCheckoutFlow(minimalConfig());
      flow.hydrate({ ...flow.getState(), paymentInProgress: true });
      expect(flow.getState().paymentInProgress).toBe(false);
    });

    it('hydrate accepts an older stored state without the new fields', () => {
      const flow = createCheckoutFlow(minimalConfig());
      const legacy = {
        currentStepId: 'b',
        completedStepIds: ['a'],
        cartSnapshot: [{ id: 'x', name: 'X', unitAmount: 250, quantity: 2 }],
        currency: null,
        sessionId: null,
        sessionStatus: 'idle',
        metadata: {},
        schemaVersion: FLOW_SCHEMA_VERSION,
      } as unknown as CheckoutFlowState;
      flow.hydrate(legacy);
      expect(flow.getState().currentStepId).toBe('b');
      expect(flow.getState().paymentInProgress).toBe(false);
      expect(flow.getState().cartTotal).toBe(500);
    });
  });

  describe('cartTotal (C5)', () => {
    const item = (id: string, unitAmount: number, quantity: number) => ({
      id,
      name: id,
      unitAmount,
      quantity,
    });

    it('is 0 for an empty cart', () => {
      const flow = createCheckoutFlow(minimalConfig());
      expect(flow.getState().cartTotal).toBe(0);
    });

    it('is computed from the initial cart', () => {
      const flow = createCheckoutFlow(
        minimalConfig({ cart: [item('a', 1000, 2), item('b', 499, 1)] })
      );
      expect(flow.getState().cartTotal).toBe(2499);
    });

    it('is updated by syncCart before a session exists', async () => {
      const flow = createCheckoutFlow(minimalConfig());
      await flow.syncCart([item('a', 300, 3)]);
      expect(flow.getState().cartTotal).toBe(900);
    });

    it('is updated by updateSession', async () => {
      const flow = createCheckoutFlow(
        minimalConfig({
          cart: [item('a', 100, 1)],
          onUpdateSession: stubSession,
        })
      );
      await flow.createSession();
      await flow.updateSession({ items: [item('a', 100, 4)] });
      expect(flow.getState().cartTotal).toBe(400);
    });

    it('keeps the total when updateSession has no items', async () => {
      const flow = createCheckoutFlow(
        minimalConfig({
          cart: [item('a', 100, 2)],
          onUpdateSession: stubSession,
        })
      );
      await flow.createSession();
      await flow.updateSession({ metadata: { note: 'x' } });
      expect(flow.getState().cartTotal).toBe(200);
    });

    it('is recomputed on hydrate, ignoring the stored value', () => {
      const flow = createCheckoutFlow(minimalConfig());
      flow.hydrate({
        ...flow.getState(),
        cartSnapshot: [item('a', 150, 2)],
        cartTotal: 999_999,
      });
      expect(flow.getState().cartTotal).toBe(300);
    });

    it('uses cartItemFields accessors', async () => {
      interface Line {
        sku: string;
        price: number;
        qty: number;
      }
      const flow = createCheckoutFlow<'stripe', unknown, Line>({
        provider: 'stripe',
        steps: [{ id: 'a' }],
        onCreateSession: stubSession,
        cart: [{ sku: 's1', price: 700, qty: 2 }],
        cartItemFields: { id: 'sku', unitAmount: 'price', quantity: 'qty' },
      });
      expect(flow.getState().cartTotal).toBe(1400);
      await flow.syncCart([{ sku: 's1', price: 700, qty: 3 }]);
      expect(flow.getState().cartTotal).toBe(2100);
    });
  });

  describe('storage without storageKey (C6a)', () => {
    const memoryAdapter = () => {
      const save = vi.fn(() => Promise.resolve());
      const load = vi.fn(() => Promise.resolve(null));
      const clear = vi.fn(() => Promise.resolve());
      return { save, load, clear };
    };

    it('enables persistence with DEFAULT_STORAGE_KEY and emits no error', async () => {
      const { events, onEvent } = recordEvents();
      const adapter = memoryAdapter();
      const flow = createCheckoutFlow(
        minimalConfig({ storage: adapter, storageSaveDebounceMs: 0, onEvent })
      );
      await flow.start();
      await vi.waitFor(() => expect(adapter.save).toHaveBeenCalled());
      expect(adapter.load).toHaveBeenCalledWith(DEFAULT_STORAGE_KEY);
      expect(adapter.save).toHaveBeenCalledWith(
        DEFAULT_STORAGE_KEY,
        expect.anything()
      );
      expect(events.filter((e) => e.type === 'error')).toHaveLength(0);
    });

    it('storageKey without storage still emits a storage error', () => {
      const { events, onEvent } = recordEvents();
      createCheckoutFlow(minimalConfig({ storageKey: 'k', onEvent }));
      expect(events).toContainEqual(
        expect.objectContaining({ type: 'error', source: 'storage' })
      );
    });

    it('saves paymentInProgress as false', async () => {
      const adapter = memoryAdapter();
      const flow = createCheckoutFlow(
        minimalConfig({ storage: adapter, storageSaveDebounceMs: 0 })
      );
      flow.setPaymentInProgress(true);
      await vi.waitFor(() => expect(adapter.save).toHaveBeenCalled());
      const saved = adapter.save.mock.lastCall as unknown as [
        string,
        CheckoutFlowState,
      ];
      expect(saved[1].paymentInProgress).toBe(false);
      expect(flow.getState().paymentInProgress).toBe(true);
    });
  });
});
