import type { BaseCartItem } from '@src/types';

import type { CheckoutStep, CheckoutStepId } from '../types';

import type { FlowContext } from './context';
import { toError } from './helpers';
import type { createStorageManager } from './storageManager';

const UNSAFE_SCHEME_RE = /^\s*(?:javascript|data|vbscript|file):/i;

export function createRouterBridge<
  TProvider extends string = string,
  TState = unknown,
  TItem = BaseCartItem,
>(
  ctx: FlowContext<TProvider, TState, TItem>,
  storage: ReturnType<typeof createStorageManager<TProvider, TState, TItem>>
) {
  const { config, steps, store, isDestroyed, emitError } = ctx;
  const router = config.router;

  let routerUnsubscribe: (() => void) | null = null;
  let syncingFromRouter = false;

  const findStepByPath = (path: string): CheckoutStep<TItem> | null => {
    for (const step of steps) {
      if (step.path !== undefined && step.path === path) return step;
    }
    return null;
  };

  const isSafePath = (path: string): boolean => {
    if (typeof path !== 'string' || path.length === 0) return false;
    return !UNSAFE_SCHEME_RE.test(path);
  };

  const push = (path: string | undefined): void => {
    if (!router || path === undefined) return;
    if (syncingFromRouter) return;
    if (!isSafePath(path)) {
      emitError('router', new Error(`Refused to push unsafe path: ${path}`));
      return;
    }
    try {
      const current = router.getCurrentPath();
      if (current === path) return;
      storage.flushPendingTimerNow();
      router.push(path);
    } catch (reason) {
      emitError('router', toError(reason));
    }
  };

  const subscribe = (
    onExternalPathChange: (matched: CheckoutStep<TItem>) => Promise<void> | void
  ): void => {
    if (!router?.subscribe) return;
    routerUnsubscribe = router.subscribe((newPath: string) => {
      if (isDestroyed()) return;
      const matched = findStepByPath(newPath);
      if (!matched) return;
      if (matched.id === store.getState().currentStepId) return;
      syncingFromRouter = true;
      void Promise.resolve(onExternalPathChange(matched)).finally(() => {
        syncingFromRouter = false;
      });
    });
  };

  const teardown = (): void => {
    if (!routerUnsubscribe) return;
    try {
      routerUnsubscribe();
    } catch {
      // Adapter unsubscribe is best-effort; swallow to avoid cascading teardown errors.
    }
    routerUnsubscribe = null;
  };

  const getCurrentPath = (): string => {
    if (!router) return '';
    try {
      return router.getCurrentPath();
    } catch (reason) {
      emitError('router', toError(reason));
      return '';
    }
  };

  const isMatchedByCurrentUrl = (stepId: CheckoutStepId): boolean => {
    return findStepByPath(getCurrentPath())?.id === stepId;
  };

  return {
    push,
    subscribe,
    teardown,
    findStepByPath,
    getCurrentPath,
    isMatchedByCurrentUrl,
    hasRouter: router !== undefined,
  };
}

export type RouterBridge = ReturnType<typeof createRouterBridge>;
