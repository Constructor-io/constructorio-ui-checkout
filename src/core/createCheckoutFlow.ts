import { createCartManager } from './flow/cartManager';
import type { FlowContext } from './flow/context';
import { findStepIndex, makeInitialState } from './flow/helpers';
import { createNavigator } from './flow/navigator';
import { createRouterBridge } from './flow/routerBridge';
import { createSessionManager } from './flow/sessionManager';
import { createStorageManager } from './flow/storageManager';
import { createEmitter } from './emitter';
import { validateFlowState } from './schema';
import { createStore } from './store';
import type {
  CheckoutEventErrorSource,
  CheckoutFlowConfig,
  CheckoutFlowCore,
  CreateCheckoutFlowOptions,
  FlowState,
  StepId,
} from './types';

export function createCheckoutFlow<
  TProvider extends string = string,
  TState = unknown,
>(
  config: CheckoutFlowConfig<TProvider, TState>,
  options?: CreateCheckoutFlowOptions
): CheckoutFlowCore<TProvider, TState> {
  if (!Array.isArray(config.steps) || config.steps.length === 0) {
    throw new Error('createCheckoutFlow: `steps` must be a non-empty array');
  }

  const seen = new Set<StepId>();
  for (const step of config.steps) {
    if (!step || typeof step.id !== 'string' || step.id.length === 0) {
      throw new Error('createCheckoutFlow: every step needs a non-empty `id`');
    }
    if (seen.has(step.id)) {
      throw new Error(`createCheckoutFlow: duplicate step id "${step.id}"`);
    }
    seen.add(step.id);
  }

  if (typeof config.onCreateSession !== 'function') {
    throw new Error('createCheckoutFlow: `onCreateSession` is required');
  }

  const initialState = makeInitialState();
  if (config.cart) initialState.cartSnapshot = config.cart.slice();
  const store = createStore<FlowState>(initialState);
  const events = createEmitter();
  const steps = config.steps.slice();
  let integratorState = config.initialState ?? ({} as TState);
  let destroyed = false;

  if (config.onEvent) {
    events.on(config.onEvent);
  }

  const emitError = (
    source: CheckoutEventErrorSource,
    error: Error,
    retry?: () => Promise<void>
  ) => {
    events.emit({ type: 'error', source, error, retry });
  };

  const isDead = (): boolean => destroyed;

  const ctx: FlowContext<TProvider, TState> = {
    config,
    steps,
    store,
    events,
    isDestroyed: isDead,
    emitError,
  };

  const storageManager = createStorageManager(ctx, {
    hydrate: (stored) => hydrate(stored),
  });

  const routerBridge = createRouterBridge(ctx, storageManager);

  const sessionManager = createSessionManager(ctx, {
    onSessionActive: () => {
      if (cartManager.hasPending()) cartManager.flushPending();
    },
  });

  const cartManager = createCartManager(ctx, sessionManager);

  const navigator = createNavigator(ctx, storageManager, routerBridge);
  const { start, next, back, goTo, complete } = navigator;

  store.subscribe((state) => {
    events.emit({ type: 'state.changed', state });
    storageManager.scheduleSave();
  });

  let mounted = false;
  const mount = (): void => {
    if (destroyed || mounted) return;
    mounted = true;
    routerBridge.subscribe((matched) => goTo(matched.id));
    if (config.autoStart) {
      void Promise.resolve().then(() => {
        if (destroyed) return;
        void start();
      });
    }
  };

  const hydrate = (input: FlowState): void => {
    if (isDead()) return;
    const validated = validateFlowState(input);
    if (!validated) {
      emitError('storage', new Error('hydrate: invalid FlowState shape'));
      return;
    }
    if (
      validated.currentStepId !== null &&
      findStepIndex(steps, validated.currentStepId) === -1
    ) {
      emitError(
        'storage',
        new Error(
          `hydrate: currentStepId "${validated.currentStepId}" is not in this flow's steps`
        )
      );
      return;
    }
    for (const id of validated.completedStepIds) {
      if (findStepIndex(steps, id) === -1) {
        emitError(
          'storage',
          new Error(`hydrate: completedStepIds contains unknown id "${id}"`)
        );
        return;
      }
    }
    const needsRecovery =
      sessionManager.getSession() === null &&
      (validated.sessionStatus === 'active' ||
        validated.sessionStatus === 'creating');
    const next = needsRecovery
      ? { ...validated, sessionStatus: 'idle' as const, sessionId: null }
      : validated;
    store.setState(() => next);
  };

  const reset = (): void => {
    if (isDead()) return;
    sessionManager.reset();
    cartManager.clearDebounce();
    store.setState(() => makeInitialState());
  };

  const clearState = async (): Promise<void> => {
    if (isDead()) return;
    reset();
    await storageManager.clearStorage();
  };

  const destroy = (): void => {
    destroyed = true;
    storageManager.cancelPending();
    cartManager.cancel();
    sessionManager.drainQueue();
    routerBridge.teardown();
    events.clear();
  };

  if (!options?.deferMount) mount();

  return {
    provider: config.provider,
    getState: () => store.getState(),
    subscribe: (listener) => store.subscribe(listener),
    mount,
    start,
    next,
    back,
    goTo,
    complete,
    hydrate,
    reset,
    clearState,
    getSession: () => sessionManager.getSession(),
    createSession: () => sessionManager.createSession(),
    updateSession: (patch) => sessionManager.updateSession(patch),
    recreate: () => sessionManager.recreate(),
    markExpired: () => sessionManager.markExpired(),
    syncCart: (items) => cartManager.syncCart(items),
    setCart: (items) => cartManager.setCart(items),
    getIntegratorState: () => integratorState,
    setIntegratorState: (updater) => {
      integratorState = updater(integratorState);
      store.setState((prev) => ({ ...prev }));
    },
    destroy,
  };
}
