import type { BaseCartItem, PaymentSessionFor } from '@src/types';

import type { CheckoutSessionUpdatePatch } from '../types';

import type { FlowContext } from './context';
import {
  computeCartDiff,
  getSessionIdFromResponse,
  isValidSessionResponse,
  toError,
} from './helpers';

export interface SessionManagerOptions {
  onSessionActive: () => void;
}

export function createSessionManager<
  TProvider extends string = string,
  TState = unknown,
  TItem = BaseCartItem,
>(ctx: FlowContext<TProvider, TState, TItem>, opts: SessionManagerOptions) {
  const { config, store, isDestroyed, events, emitError, accessors } = ctx;

  type Session = PaymentSessionFor<TProvider>;

  interface QueuedUpdate {
    patch: CheckoutSessionUpdatePatch<TItem>;
    resolve: (value: Session | null) => void;
  }

  let session: Session | null = null;
  const queue: QueuedUpdate[] = [];
  let queueRunning = false;
  let createInFlight: Promise<Session | null> | null = null;
  let requestGen = 0;

  const getSession = (): Session | null => session;
  const getCreateInFlight = (): Promise<Session | null> | null =>
    createInFlight;

  const drainQueue = (): void => {
    while (queue.length > 0) {
      const q = queue.shift();
      if (q) q.resolve(null);
    }
  };

  const invalidate = (): void => {
    session = null;
    requestGen += 1;
    createInFlight = null;
    drainQueue();
  };

  const createSession = (): Promise<Session | null> => {
    if (isDestroyed()) return Promise.resolve(null);
    if (session !== null) return Promise.resolve(session);
    if (createInFlight !== null) return createInFlight;

    const gen = ++requestGen;
    const run = async (): Promise<Session | null> => {
      store.setState((prev) => ({ ...prev, sessionStatus: 'creating' }));
      try {
        const response = await config.onCreateSession(store.getState());
        if (isDestroyed() || gen !== requestGen) return null;
        if (!isValidSessionResponse(response)) {
          throw new Error('onCreateSession must resolve with a session object');
        }
        session = response;
        const sessionId = getSessionIdFromResponse(response, config.provider);
        store.setState((prev) => ({
          ...prev,
          sessionStatus: 'active',
          sessionId,
        }));
        if (sessionId) {
          events.emit({ type: 'session.created', sessionId });
        }
        opts.onSessionActive();
        return response;
      } catch (reason) {
        if (isDestroyed() || gen !== requestGen) return null;
        store.setState((prev) => ({ ...prev, sessionStatus: 'error' }));
        emitError('session.create', toError(reason), async () => {
          await createSession();
        });
        return null;
      } finally {
        if (gen === requestGen) createInFlight = null;
      }
    };

    createInFlight = run();
    return createInFlight;
  };

  const runUpdate = async (
    patch: CheckoutSessionUpdatePatch<TItem>
  ): Promise<Session | null> => {
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
    const gen = requestGen;
    try {
      const response = await config.onUpdateSession(patch);
      if (isDestroyed() || gen !== requestGen) return null;
      if (!isValidSessionResponse(response)) {
        throw new Error('onUpdateSession must resolve with a session object');
      }
      session = response;
      const sessionId = getSessionIdFromResponse(response, config.provider);
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
          diff: patch.items
            ? computeCartDiff(before, patch.items, accessors)
            : {},
        });
      }
      return response;
    } catch (reason) {
      if (isDestroyed() || gen !== requestGen) return null;
      emitError('session.update', toError(reason), async () => {
        await updateSession(patch);
      });
      return null;
    }
  };

  const flushQueue = async (): Promise<void> => {
    if (queueRunning) return;
    queueRunning = true;
    try {
      while (queue.length > 0) {
        const next = queue.shift();
        if (!next) break;
        const result = await runUpdate(next.patch);
        next.resolve(result);
      }
    } finally {
      queueRunning = false;
    }
  };

  const updateSession = (
    patch: CheckoutSessionUpdatePatch<TItem>
  ): Promise<Session | null> => {
    if (isDestroyed()) return Promise.resolve(null);
    return new Promise((resolve) => {
      queue.push({ patch, resolve });
      void flushQueue();
    });
  };

  const markExpired = (): void => {
    if (isDestroyed()) return;
    if (!session) return;
    const sessionId = getSessionIdFromResponse(session, config.provider);
    invalidate();
    store.setState((prev) => ({ ...prev, sessionStatus: 'expired' }));
    if (sessionId) events.emit({ type: 'session.expired', sessionId });
  };

  const recreate = async (): Promise<Session | null> => {
    if (isDestroyed()) return null;
    const oldSessionId = session
      ? getSessionIdFromResponse(session, config.provider)
      : store.getState().sessionId;
    invalidate();
    store.setState((prev) => ({
      ...prev,
      sessionId: null,
      sessionStatus: 'idle',
    }));
    const response = await createSession();
    if (isDestroyed()) return null;
    if (response && oldSessionId) {
      const newSessionId = getSessionIdFromResponse(response, config.provider);
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

  const reset = (): void => {
    invalidate();
  };

  return {
    getSession,
    createSession,
    updateSession,
    recreate,
    markExpired,
    invalidate,
    reset,
    drainQueue,
    getCreateInFlight,
  };
}

export type SessionManager = ReturnType<typeof createSessionManager>;
