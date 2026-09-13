import type { CheckoutItem, CheckoutSessionResponse } from '@src/types';

import { createEmitter } from './emitter';
import { validateFlowState } from './schema';
import { computeCartDiff, extractSessionId } from './session';
import { createStore } from './store';
import type {
  CheckoutEvent,
  CheckoutEventErrorSource,
  CheckoutFlowConfig,
  CheckoutFlowCore,
  FlowState,
  SessionUpdatePatch,
  Step,
  StepId,
} from './types';
import { FLOW_SCHEMA_VERSION } from './types';

function makeInitialState(): FlowState {
  return {
    currentStepId: null,
    completedStepIds: [],
    cartSnapshot: [],
    sessionId: null,
    sessionStatus: 'idle',
    metadata: {},
    schemaVersion: FLOW_SCHEMA_VERSION,
  };
}

function findStepIndex(steps: Step[], id: StepId | null): number {
  if (id === null) return -1;
  return steps.findIndex((s) => s.id === id);
}

function toError(reason: unknown): Error {
  if (reason instanceof Error) return reason;
  if (typeof reason === 'string') return new Error(reason);
  return new Error('Unknown error');
}

export function createCheckoutFlow<TState = unknown>(
  config: CheckoutFlowConfig<TState>
): CheckoutFlowCore<TState> {
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

  const store = createStore<FlowState>(makeInitialState());
  const events = createEmitter();
  const steps = config.steps.slice();
  let integratorState = config.initialState ?? ({} as TState);
  let session: CheckoutSessionResponse | null = null;
  let destroyed = false;

  const storage = config.storage;
  const storageKey = config.storageKey;
  const storageEnabled = storage !== undefined && storageKey !== undefined;
  const storageSaveDebounceMs = config.storageSaveDebounceMs ?? 150;
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  let lastSavedSerialized: string | null = null;
  let hydrating = false;

  const router = config.router;
  let routerUnsubscribe: (() => void) | null = null;
  let syncingFromRouter = false;

  const cartDebounceMs = config.cartDebounceMs ?? 400;
  let cartTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingCart: CheckoutItem[] | null = null;

  interface QueuedUpdate {
    patch: SessionUpdatePatch;
    resolve: (value: CheckoutSessionResponse | null) => void;
  }
  const sessionQueue: QueuedUpdate[] = [];
  let sessionQueueRunning = false;

  if (config.onEvent) {
    events.on(config.onEvent);
  }

  store.subscribe((state) => {
    events.emit({ type: 'state.changed', state });
  });

  const emitError = (
    source: CheckoutEventErrorSource,
    error: Error,
    retry?: () => Promise<void>
  ) => {
    events.emit({ type: 'error', source, error, retry });
  };

  let saveInFlight: Promise<void> | null = null;
  let pendingSaveState: FlowState | null = null;

  const flushSave = (): void => {
    if (!storageEnabled || destroyed) return;
    const state = store.getState();
    const serialized = JSON.stringify(state);
    if (serialized === lastSavedSerialized) return;

    // Serialize writes: if a save is in flight, mark the latest state as
    // pending — the in-flight save's finally block will re-flush.
    if (saveInFlight !== null) {
      pendingSaveState = state;
      return;
    }

    const previousMark = lastSavedSerialized;
    lastSavedSerialized = serialized;
    saveInFlight = storage
      .save(storageKey, state)
      .catch((reason: unknown) => {
        // Restore prior mark so subsequent flushSave() re-attempts.
        lastSavedSerialized = previousMark;
        emitError('storage', toError(reason));
      })
      .finally(() => {
        saveInFlight = null;
        if (pendingSaveState !== null && !destroyed) {
          pendingSaveState = null;
          flushSave();
        }
      });
  };

  const scheduleSave = (): void => {
    if (!storageEnabled || destroyed || hydrating) return;
    if (saveTimer !== null) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = null;
      flushSave();
    }, storageSaveDebounceMs);
  };

  const maybeAutoResume = async (): Promise<boolean> => {
    if (!storageEnabled) return false;
    if (config.storageAutoResume === false) return false;
    try {
      const stored = await storage.load(storageKey);
      if (!stored) return false;
      hydrating = true;
      hydrate(stored);
      hydrating = false;
      const s = store.getState();
      lastSavedSerialized = JSON.stringify(s);
      return s.currentStepId !== null;
    } catch (reason) {
      emitError('storage', toError(reason));
      hydrating = false;
      return false;
    }
  };

  if (storageEnabled) {
    store.subscribe(() => {
      scheduleSave();
    });
  }

  if (router?.subscribe) {
    routerUnsubscribe = router.subscribe((newPath: string) => {
      if (destroyed) return;
      const matched = findStepByPath(newPath);
      const state = store.getState();
      if (!matched) return;
      if (matched.id === state.currentStepId) return;
      syncingFromRouter = true;
      void Promise.resolve(goTo(matched.id)).finally(() => {
        syncingFromRouter = false;
      });
    });
  }

  const checkDestroyed = (op: string): boolean => {
    if (destroyed) {
      emitError('guard', new Error(`Flow destroyed; cannot ${op}`));
      return true;
    }
    return false;
  };

  const findStepByPath = (path: string): Step | null => {
    for (const step of steps) {
      if (step.path !== undefined && step.path === path) return step;
    }
    return null;
  };

  const isSafePath = (path: string): boolean => {
    if (typeof path !== 'string' || path.length === 0) return false;
    // Reject javascript:, data:, vbscript:, file: — all common XSS vectors when
    // passed unchecked to router.push (which typically resolves to a nav).
    return !/^\s*(?:javascript|data|vbscript|file):/i.test(path);
  };

  const pushRouterPath = (path: string | undefined): void => {
    if (!router || path === undefined) return;
    if (syncingFromRouter) return;
    if (!isSafePath(path)) {
      emitError('router', new Error(`Refused to push unsafe path: ${path}`));
      return;
    }
    try {
      const current = router.getCurrentPath();
      if (current === path) return;
      router.push(path);
    } catch (reason) {
      emitError('router', toError(reason));
    }
  };

  const runGuard = async (step: Step): Promise<boolean> => {
    if (!step.guard) return true;
    try {
      return await step.guard(store.getState());
    } catch (reason) {
      emitError('guard', toError(reason));
      return false;
    }
  };

  const enterStep = (stepId: StepId, from: StepId | null) => {
    store.setState((prev) => ({ ...prev, currentStepId: stepId }));
    events.emit({ type: 'step.entered', stepId, from });
    const step = steps[findStepIndex(steps, stepId)];
    if (step) pushRouterPath(step.path);
  };

  const exitStep = (stepId: StepId, to: StepId | null) => {
    events.emit({ type: 'step.exited', stepId, to });
    store.setState((prev) => {
      if (prev.completedStepIds.includes(stepId)) return prev;
      return {
        ...prev,
        completedStepIds: [...prev.completedStepIds, stepId],
      };
    });
  };

  const start = async (): Promise<void> => {
    if (checkDestroyed('start')) return;
    const state = store.getState();
    if (state.currentStepId !== null) return;

    const resumed = await maybeAutoResume();
    if (resumed) return;

    if (router) {
      let currentPath = '';
      try {
        currentPath = router.getCurrentPath();
      } catch (reason) {
        emitError('router', toError(reason));
      }
      const matched = findStepByPath(currentPath);
      if (matched) {
        const guardOk = await runGuard(matched);
        if (guardOk) {
          events.emit({ type: 'flow.started' });
          enterStep(matched.id, null);
          return;
        }
      }
    }

    const first = steps[0];
    const guardOk = await runGuard(first);
    if (!guardOk) return;

    events.emit({ type: 'flow.started' });
    enterStep(first.id, null);
  };

  const complete = (): void => {
    if (checkDestroyed('complete')) return;
    events.emit({ type: 'flow.completed' });
  };

  const next = async (opts?: { skip?: boolean }): Promise<void> => {
    if (checkDestroyed('next')) return;
    const state = store.getState();
    if (state.currentStepId === null) {
      await start();
      return;
    }

    const idx = findStepIndex(steps, state.currentStepId);
    if (idx === -1) {
      emitError(
        'guard',
        new Error(`Current step "${state.currentStepId}" not in steps array`)
      );
      return;
    }

    const current = steps[idx];
    if (opts?.skip && !current.optional) {
      emitError(
        'guard',
        new Error(`Cannot skip required step "${current.id}"`)
      );
      return;
    }

    const nextIdx = idx + 1;
    if (nextIdx >= steps.length) {
      exitStep(current.id, null);
      complete();
      return;
    }

    const nextStep = steps[nextIdx];
    const guardOk = await runGuard(nextStep);
    if (!guardOk) return;

    exitStep(current.id, nextStep.id);
    enterStep(nextStep.id, current.id);
  };

  const back = (): Promise<void> => {
    if (checkDestroyed('back')) return Promise.resolve();
    const state = store.getState();
    if (state.currentStepId === null) return Promise.resolve();
    const idx = findStepIndex(steps, state.currentStepId);
    if (idx <= 0) return Promise.resolve();
    const prevStep = steps[idx - 1];
    const current = steps[idx];
    // Back re-enters prevStep, so it is no longer complete; current stays uncompleted.
    events.emit({ type: 'step.exited', stepId: current.id, to: prevStep.id });
    store.setState((prev) => ({
      ...prev,
      completedStepIds: prev.completedStepIds.filter(
        (id) => id !== prevStep.id
      ),
    }));
    enterStep(prevStep.id, current.id);
    return Promise.resolve();
  };

  const goTo = async (stepId: StepId): Promise<void> => {
    if (checkDestroyed('goTo')) return;
    const target = steps.find((s) => s.id === stepId);
    if (!target) {
      emitError('guard', new Error(`Unknown step id "${stepId}"`));
      return;
    }
    if (store.getState().currentStepId === stepId) return;
    const guardOk = await runGuard(target);
    if (!guardOk || destroyed) return;
    const state = store.getState();
    const from = state.currentStepId;
    if (from !== null) {
      const currentIdx = findStepIndex(steps, from);
      const targetIdx = findStepIndex(steps, stepId);
      if (targetIdx > currentIdx) {
        for (let i = currentIdx; i < targetIdx; i += 1) {
          exitStep(steps[i].id, steps[i + 1].id);
        }
      } else {
        events.emit({ type: 'step.exited', stepId: from, to: stepId });
      }
    } else {
      events.emit({ type: 'flow.started' });
    }
    enterStep(stepId, from);
  };

  const hydrate = (input: FlowState): void => {
    if (checkDestroyed('hydrate')) return;
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
    store.setState(() => validated);
  };

  const drainSessionQueue = (): void => {
    while (sessionQueue.length > 0) {
      const q = sessionQueue.shift();
      if (q) q.resolve(null);
    }
  };

  const clearCartDebounce = (): void => {
    if (cartTimer !== null) {
      clearTimeout(cartTimer);
      cartTimer = null;
    }
    pendingCart = null;
  };

  const reset = (): void => {
    if (checkDestroyed('reset')) return;
    session = null;
    drainSessionQueue();
    clearCartDebounce();
    store.setState(() => makeInitialState());
  };

  let createSessionInFlight: Promise<CheckoutSessionResponse | null> | null =
    null;

  const createSession = (): Promise<CheckoutSessionResponse | null> => {
    if (checkDestroyed('createSession')) return Promise.resolve(null);
    if (session !== null) return Promise.resolve(session);
    if (createSessionInFlight !== null) return createSessionInFlight;

    const run = async (): Promise<CheckoutSessionResponse | null> => {
      store.setState((prev) => ({ ...prev, sessionStatus: 'creating' }));
      try {
        const response = await config.onCreateSession(store.getState());
        if (destroyed) return null;
        if (
          !response ||
          typeof response.clientSecret !== 'string' ||
          typeof response.publishableKey !== 'string'
        ) {
          throw new Error(
            'onCreateSession must resolve with { clientSecret, publishableKey }'
          );
        }
        session = response;
        const sessionId = extractSessionId(response.clientSecret);
        store.setState((prev) => ({
          ...prev,
          sessionStatus: 'active',
          sessionId,
        }));
        if (sessionId) {
          events.emit({ type: 'session.created', sessionId });
        }
        return response;
      } catch (reason) {
        if (destroyed) return null;
        store.setState((prev) => ({ ...prev, sessionStatus: 'error' }));
        emitError('session.create', toError(reason));
        return null;
      } finally {
        createSessionInFlight = null;
      }
    };

    createSessionInFlight = run();
    return createSessionInFlight;
  };

  const runUpdate = async (
    patch: SessionUpdatePatch
  ): Promise<CheckoutSessionResponse | null> => {
    if (!config.onUpdateSession) {
      emitError(
        'session.update',
        new Error('updateSession called without onUpdateSession config')
      );
      return null;
    }
    if (!session) {
      emitError(
        'session.update',
        new Error('updateSession called before createSession')
      );
      return null;
    }
    const before = store.getState().cartSnapshot;
    try {
      const response = await config.onUpdateSession(patch);
      if (destroyed) return null;
      if (
        !response ||
        typeof response.clientSecret !== 'string' ||
        typeof response.publishableKey !== 'string'
      ) {
        throw new Error(
          'onUpdateSession must resolve with { clientSecret, publishableKey }'
        );
      }
      session = response;
      const sessionId = extractSessionId(response.clientSecret);
      const nextItems = patch.items ?? before;
      store.setState((prev) => ({
        ...prev,
        sessionId,
        cartSnapshot: patch.items ? patch.items.slice() : prev.cartSnapshot,
      }));
      if (sessionId) {
        events.emit({
          type: 'session.updated',
          sessionId,
          reason: patch.reason ?? 'manual',
          diff: patch.items ? computeCartDiff(before, nextItems) : {},
        });
      }
      return response;
    } catch (reason) {
      if (destroyed) return null;
      emitError('session.update', toError(reason));
      return null;
    }
  };

  const flushQueue = async (): Promise<void> => {
    if (sessionQueueRunning) return;
    sessionQueueRunning = true;
    try {
      while (sessionQueue.length > 0) {
        const next = sessionQueue.shift();
        if (!next) break;
        const result = await runUpdate(next.patch);
        next.resolve(result);
      }
    } finally {
      sessionQueueRunning = false;
    }
  };

  const updateSession = (
    patch: SessionUpdatePatch
  ): Promise<CheckoutSessionResponse | null> => {
    if (checkDestroyed('updateSession')) return Promise.resolve(null);
    return new Promise((resolve) => {
      sessionQueue.push({ patch, resolve });
      void flushQueue();
    });
  };

  const syncCart = (
    items: CheckoutItem[]
  ): Promise<CheckoutSessionResponse | null> => {
    if (checkDestroyed('syncCart')) return Promise.resolve(null);
    if (cartTimer !== null) {
      clearTimeout(cartTimer);
      cartTimer = null;
    }
    pendingCart = null;
    if (!session) {
      store.setState((prev) => ({
        ...prev,
        cartSnapshot: items.slice(),
      }));
      return Promise.resolve(null);
    }
    return updateSession({ items, reason: 'items' });
  };

  const flushPendingCart = (): void => {
    if (!pendingCart) return;
    const items = pendingCart;
    pendingCart = null;
    cartTimer = null;
    void syncCart(items);
  };

  const setCart = (items: CheckoutItem[]): void => {
    if (checkDestroyed('setCart')) return;
    const nextSerialized = JSON.stringify(items);
    // Content-equality check prevents debounce-reset death when merchants pass
    // a new-reference-same-content array on every rerender (common in React).
    const comparisonBase = pendingCart ?? store.getState().cartSnapshot;
    if (JSON.stringify(comparisonBase) === nextSerialized) return;
    pendingCart = items.slice();
    if (cartTimer !== null) clearTimeout(cartTimer);
    if (cartDebounceMs <= 0) {
      flushPendingCart();
      return;
    }
    cartTimer = setTimeout(flushPendingCart, cartDebounceMs);
  };

  if (config.cart) {
    store.setState((prev) => ({
      ...prev,
      cartSnapshot: (config.cart ?? []).slice(),
    }));
  }

  const markExpired = (): void => {
    if (checkDestroyed('markExpired')) return;
    if (!session) return;
    const sessionId = extractSessionId(session.clientSecret);
    session = null;
    drainSessionQueue();
    store.setState((prev) => ({ ...prev, sessionStatus: 'expired' }));
    if (sessionId) events.emit({ type: 'session.expired', sessionId });
  };

  const recreate = async (): Promise<CheckoutSessionResponse | null> => {
    if (checkDestroyed('recreate')) return null;
    const oldSessionId = session
      ? extractSessionId(session.clientSecret)
      : store.getState().sessionId;
    session = null;
    drainSessionQueue();
    store.setState((prev) => ({
      ...prev,
      sessionId: null,
      sessionStatus: 'idle',
    }));
    const response = await createSession();
    if (destroyed) return null;
    if (response) {
      const newSessionId = extractSessionId(response.clientSecret);
      if (oldSessionId && newSessionId) {
        events.emit({
          type: 'session.recreated',
          oldSessionId,
          newSessionId,
        });
      }
    }
    return response;
  };

  const clearState = async (): Promise<void> => {
    if (checkDestroyed('clearState')) return;
    reset();
    if (!storageEnabled) return;
    if (saveTimer !== null) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    pendingSaveState = null;
    lastSavedSerialized = null;
    try {
      await storage.clear(storageKey);
    } catch (reason) {
      if (destroyed) return;
      emitError('storage', toError(reason));
    }
  };

  const destroy = (): void => {
    destroyed = true;
    if (saveTimer !== null) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    if (cartTimer !== null) {
      clearTimeout(cartTimer);
      cartTimer = null;
    }
    pendingCart = null;
    pendingSaveState = null;
    drainSessionQueue();
    if (routerUnsubscribe) {
      try {
        routerUnsubscribe();
      } catch {
        // adapter unsubscribe should not throw; if it does, ignore
      }
      routerUnsubscribe = null;
    }
    events.clear();
  };

  return {
    getState: () => store.getState(),
    subscribe: (listener) => store.subscribe(listener),
    start,
    next,
    back,
    goTo,
    complete,
    hydrate,
    reset,
    clearState,
    getSession: () => session,
    createSession,
    updateSession,
    recreate,
    markExpired,
    syncCart,
    setCart,
    getIntegratorState: () => integratorState,
    setIntegratorState: (updater) => {
      integratorState = updater(integratorState);
    },
    destroy,
  };
}

export type { CheckoutEvent, CheckoutFlowConfig, CheckoutFlowCore };
