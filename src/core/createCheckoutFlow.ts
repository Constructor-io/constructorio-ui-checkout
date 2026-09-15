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
  let createSessionInFlight: Promise<CheckoutSessionResponse | null> | null =
    null;
  let sessionRequestGen = 0;

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
  let hasPendingSave = false;
  let clearing = false;

  const flushSave = (): void => {
    if (!storageEnabled || destroyed || clearing) return;
    const state = store.getState();
    const serialized = JSON.stringify(state);
    if (serialized === lastSavedSerialized) return;

    // Serialize writes: if a save is in flight, defer — the in-flight save's
    // finally block will re-flush and pick up the latest state.
    if (saveInFlight !== null) {
      hasPendingSave = true;
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
        if (hasPendingSave && !destroyed) {
          hasPendingSave = false;
          flushSave();
        }
      });
  };

  const scheduleSave = (): void => {
    if (!storageEnabled || destroyed || hydrating || clearing) return;
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

  // Operations after destroy() are silent no-ops. events.clear() runs in
  // destroy(), so any error emission here would go to zero listeners anyway.
  const isDead = (): boolean => destroyed;

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

  const findFirstFailingGuard = async (
    fromIdx: number,
    toIdx: number
  ): Promise<number | null> => {
    for (let i = fromIdx; i <= toIdx; i += 1) {
      const ok = await runGuard(steps[i]);
      if (destroyed) return i;
      if (!ok) return i;
    }
    return null;
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
    if (isDead()) return;
    const state = store.getState();
    if (state.currentStepId !== null) return;

    if (config.authenticate) {
      try {
        const result = await config.authenticate();
        if (destroyed) return;
        if (result === null) {
          emitError(
            'authenticate',
            new Error('authenticate: rejected — flow not started')
          );
          return;
        }
      } catch (reason) {
        if (destroyed) return;
        emitError('authenticate', toError(reason));
        return;
      }
    }

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
        const matchedIdx = findStepIndex(steps, matched.id);
        const failIdx = await findFirstFailingGuard(0, matchedIdx);
        if (destroyed) return;
        if (failIdx === null) {
          events.emit({ type: 'flow.started' });
          enterStep(matched.id, null);
          return;
        }
        const failedStep = steps[failIdx];
        emitError(
          'guard',
          new Error(
            failIdx === matchedIdx
              ? `start: guard for "${matched.id}" rejected`
              : `start: prerequisite step "${failedStep.id}" guard rejected before "${matched.id}"`
          )
        );
        return;
      }
    }

    const first = steps[0];
    const guardOk = await runGuard(first);
    if (!guardOk) return;

    events.emit({ type: 'flow.started' });
    enterStep(first.id, null);
  };

  const complete = (): void => {
    if (isDead()) return;
    events.emit({ type: 'flow.completed' });
  };

  const next = async (opts?: { skip?: boolean }): Promise<void> => {
    if (isDead()) return;
    const state = store.getState();
    if (state.currentStepId === null) {
      await start();
      return;
    }

    // currentStepId is guaranteed to be in steps: it's set only via enterStep
    // (which passes a step from `steps`) or via hydrate (which rejects unknown
    // ids), and `steps` is captured immutably at construction.
    const idx = findStepIndex(steps, state.currentStepId);
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
    if (isDead()) return Promise.resolve();
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
    if (isDead()) return;
    const targetIdx = findStepIndex(steps, stepId);
    if (targetIdx === -1) {
      emitError('guard', new Error(`Unknown step id "${stepId}"`));
      return;
    }
    const from = store.getState().currentStepId;
    if (from === stepId) return;
    const fromIdx = from === null ? -1 : findStepIndex(steps, from);

    const guardStart = fromIdx < targetIdx ? fromIdx + 1 : targetIdx;
    const failIdx = await findFirstFailingGuard(guardStart, targetIdx);
    if (destroyed) return;
    if (failIdx !== null) {
      const failedStep = steps[failIdx];
      emitError(
        'guard',
        new Error(
          failIdx === targetIdx
            ? `goTo("${stepId}"): guard rejected`
            : `goTo("${stepId}"): prerequisite step "${failedStep.id}" guard rejected`
        )
      );
      return;
    }

    const currentFrom = store.getState().currentStepId;
    const currentFromIdx =
      currentFrom === null ? -1 : findStepIndex(steps, currentFrom);
    if (currentFrom !== null) {
      if (targetIdx > currentFromIdx) {
        for (let i = currentFromIdx; i < targetIdx; i += 1) {
          exitStep(steps[i].id, steps[i + 1].id);
        }
      } else {
        events.emit({ type: 'step.exited', stepId: currentFrom, to: stepId });
        store.setState((prev) => ({
          ...prev,
          completedStepIds: prev.completedStepIds.filter((id) => id !== stepId),
        }));
      }
    } else {
      events.emit({ type: 'flow.started' });
    }
    enterStep(stepId, currentFrom);
  };

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
      session === null &&
      (validated.sessionStatus === 'active' ||
        validated.sessionStatus === 'creating');
    const next = needsRecovery
      ? { ...validated, sessionStatus: 'idle' as const, sessionId: null }
      : validated;
    store.setState(() => next);
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

  // Bump the generation so any in-flight session request or queued update
  // aborts on completion, clear the resident session, and drain waiters.
  const invalidateSession = (): void => {
    session = null;
    sessionRequestGen += 1;
    createSessionInFlight = null;
    drainSessionQueue();
  };

  const reset = (): void => {
    if (isDead()) return;
    invalidateSession();
    clearCartDebounce();
    store.setState(() => makeInitialState());
  };

  const createSession = (): Promise<CheckoutSessionResponse | null> => {
    if (isDead()) return Promise.resolve(null);
    if (session !== null) return Promise.resolve(session);
    if (createSessionInFlight !== null) return createSessionInFlight;

    const gen = ++sessionRequestGen;
    const run = async (): Promise<CheckoutSessionResponse | null> => {
      store.setState((prev) => ({ ...prev, sessionStatus: 'creating' }));
      try {
        const response = await config.onCreateSession(store.getState());
        if (destroyed || gen !== sessionRequestGen) return null;
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
        if (destroyed || gen !== sessionRequestGen) return null;
        store.setState((prev) => ({ ...prev, sessionStatus: 'error' }));
        emitError('session.create', toError(reason));
        return null;
      } finally {
        if (gen === sessionRequestGen) createSessionInFlight = null;
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
    const gen = sessionRequestGen;
    try {
      const response = await config.onUpdateSession(patch);
      if (destroyed || gen !== sessionRequestGen) return null;
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
          diff: patch.items ? computeCartDiff(before, patch.items) : {},
        });
      }
      return response;
    } catch (reason) {
      if (destroyed || gen !== sessionRequestGen) return null;
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
    if (isDead()) return Promise.resolve(null);
    return new Promise((resolve) => {
      sessionQueue.push({ patch, resolve });
      void flushQueue();
    });
  };

  const syncCart = (
    items: CheckoutItem[]
  ): Promise<CheckoutSessionResponse | null> => {
    if (isDead()) return Promise.resolve(null);
    clearCartDebounce();
    if (!session) {
      store.setState((prev) => ({ ...prev, cartSnapshot: items.slice() }));
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
    if (isDead()) return;
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
    if (isDead()) return;
    if (!session) return;
    const sessionId = extractSessionId(session.clientSecret);
    invalidateSession();
    store.setState((prev) => ({ ...prev, sessionStatus: 'expired' }));
    if (sessionId) events.emit({ type: 'session.expired', sessionId });
  };

  const recreate = async (): Promise<CheckoutSessionResponse | null> => {
    if (isDead()) return null;
    const oldSessionId = session
      ? extractSessionId(session.clientSecret)
      : store.getState().sessionId;
    invalidateSession();
    store.setState((prev) => ({
      ...prev,
      sessionId: null,
      sessionStatus: 'idle',
    }));
    const response = await createSession();
    if (destroyed) return null;
    if (response && oldSessionId) {
      const newSessionId = extractSessionId(response.clientSecret);
      if (newSessionId) {
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
    if (isDead()) return;
    clearing = true;
    try {
      reset();
      if (!storageEnabled) return;
      if (saveTimer !== null) {
        clearTimeout(saveTimer);
        saveTimer = null;
      }
      hasPendingSave = false;
      if (saveInFlight !== null) {
        try {
          await saveInFlight;
        } catch {
          // ignore — save already emitted its own storage error
        }
      }
      lastSavedSerialized = null;
      try {
        await storage.clear(storageKey);
      } catch (reason) {
        if (destroyed) return;
        emitError('storage', toError(reason));
      }
    } finally {
      clearing = false;
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
    hasPendingSave = false;
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

  if (config.autoStart) {
    void Promise.resolve().then(() => {
      if (destroyed) return;
      void start();
    });
  }

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
      store.setState((prev) => ({ ...prev }));
    },
    destroy,
  };
}

export type { CheckoutEvent, CheckoutFlowConfig, CheckoutFlowCore };
