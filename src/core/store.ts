export interface Store<T> {
  getState(): T;
  setState(updater: (prev: T) => T): void;
  subscribe(listener: (state: T) => void): () => void;
}

export function createStore<T>(initial: T): Store<T> {
  let state = initial;
  const listeners = new Set<(state: T) => void>();

  return {
    getState: () => state,
    setState: (updater) => {
      const next = updater(state);
      if (Object.is(next, state)) return;
      state = next;
      listeners.forEach((listener) => {
        try {
          listener(state);
        } catch {
          // Listener errors must not break sibling listeners or the caller.
        }
      });
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
