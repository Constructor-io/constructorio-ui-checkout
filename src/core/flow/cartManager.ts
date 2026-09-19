import type { BaseCartItem, PaymentSessionFor } from '@src/types';

import type { FlowContext } from './context';
import type { createSessionManager } from './sessionManager';

export function createCartManager<
  TProvider extends string = string,
  TState = unknown,
  TItem = BaseCartItem,
>(
  ctx: FlowContext<TProvider, TState, TItem>,
  session: ReturnType<typeof createSessionManager<TProvider, TState, TItem>>
) {
  const { config, store, isDestroyed } = ctx;
  const debounceMs = config.cartDebounceMs ?? 400;

  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: TItem[] | null = null;

  const clearDebounce = (): void => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    pending = null;
  };

  const hasPending = (): boolean => pending !== null;

  const syncCart = (
    items: TItem[]
  ): Promise<PaymentSessionFor<TProvider> | null> => {
    if (isDestroyed()) return Promise.resolve(null);
    clearDebounce();
    if (!session.getSession()) {
      store.setState((prev) => ({ ...prev, cartSnapshot: items.slice() }));
      const pendingCreate = session.getCreateInFlight();
      if (pendingCreate !== null) {
        return pendingCreate.then((response) => {
          if (isDestroyed() || !response) return null;
          return session.updateSession({ items, reason: 'items' });
        });
      }
      return Promise.resolve(null);
    }
    return session.updateSession({ items, reason: 'items' });
  };

  const flushPending = (): void => {
    if (!pending) return;
    const items = pending;
    pending = null;
    timer = null;
    void syncCart(items);
  };

  const setCart = (items: TItem[]): void => {
    if (isDestroyed()) return;
    const nextSerialized = JSON.stringify(items);
    const comparisonBase = pending ?? store.getState().cartSnapshot;
    if (JSON.stringify(comparisonBase) === nextSerialized) return;
    pending = items.slice();
    if (timer !== null) clearTimeout(timer);
    if (debounceMs <= 0) {
      flushPending();
      return;
    }
    timer = setTimeout(flushPending, debounceMs);
  };

  const cancel = (): void => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    pending = null;
  };

  return {
    setCart,
    syncCart,
    flushPending,
    clearDebounce,
    cancel,
    hasPending,
  };
}

export type CartManager = ReturnType<typeof createCartManager>;
