import type { BaseCartItem } from '@src/types';

import type { CheckoutEvent } from './types';

export interface EventEmitter<TItem = BaseCartItem> {
  emit(event: CheckoutEvent<TItem>): void;
  on(listener: (event: CheckoutEvent<TItem>) => void): () => void;
  clear(): void;
}

export function createEmitter<TItem = BaseCartItem>(): EventEmitter<TItem> {
  const listeners = new Set<(event: CheckoutEvent<TItem>) => void>();

  return {
    emit: (event) => {
      listeners.forEach((listener) => {
        try {
          listener(event);
        } catch {
          // Listener errors must not interrupt the emit loop.
        }
      });
    },
    on: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    clear: () => {
      listeners.clear();
    },
  };
}
