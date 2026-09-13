import type { CheckoutEvent } from './types';

export interface EventEmitter {
  emit(event: CheckoutEvent): void;
  on(listener: (event: CheckoutEvent) => void): () => void;
  clear(): void;
}

export function createEmitter(): EventEmitter {
  const listeners = new Set<(event: CheckoutEvent) => void>();

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
