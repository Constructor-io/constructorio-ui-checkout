import { validateFlowState } from '@src/core/schema';
import type {
  CheckoutFlowState,
  CheckoutStorageAdapter,
} from '@src/core/types';
import type { BaseCartItem } from '@src/types';

const STORAGE_KEY_PREFIX = 'cio-checkout-flow:';
const PROBE_KEY = `${STORAGE_KEY_PREFIX}__probe__`;

// SSR-safe: no window/sessionStorage access at module scope.
const hasSessionStorage = (): boolean => {
  if (typeof globalThis === 'undefined') return false;
  try {
    const storage = (globalThis as { sessionStorage?: Storage }).sessionStorage;
    if (!storage) return false;
    storage.setItem(PROBE_KEY, '1');
    storage.removeItem(PROBE_KEY);
    return true;
  } catch {
    return false;
  }
};

const namespacedKey = (key: string): string => `${STORAGE_KEY_PREFIX}${key}`;

export function createSessionStorageAdapter<
  TItem = BaseCartItem,
>(): CheckoutStorageAdapter<TItem> {
  return {
    load: (key) => {
      if (!hasSessionStorage()) return Promise.resolve(null);
      const namespaced = namespacedKey(key);
      try {
        const raw = globalThis.sessionStorage.getItem(namespaced);
        if (raw === null) return Promise.resolve(null);
        const parsed: unknown = JSON.parse(raw);
        const validated = validateFlowState<TItem>(parsed);
        if (!validated) {
          globalThis.sessionStorage.removeItem(namespaced);
          return Promise.resolve(null);
        }
        return Promise.resolve(validated);
      } catch {
        try {
          globalThis.sessionStorage.removeItem(namespaced);
        } catch {
          // ignore — storage was probably the source of the outer throw
        }
        return Promise.resolve(null);
      }
    },
    save: (key, state) => {
      if (!hasSessionStorage()) return Promise.resolve();
      try {
        globalThis.sessionStorage.setItem(
          namespacedKey(key),
          JSON.stringify(state)
        );
        return Promise.resolve();
      } catch (reason) {
        return Promise.reject(
          reason instanceof Error ? reason : new Error(String(reason))
        );
      }
    },
    clear: (key) => {
      if (!hasSessionStorage()) return Promise.resolve();
      try {
        globalThis.sessionStorage.removeItem(namespacedKey(key));
      } catch {
        // ignore
      }
      return Promise.resolve();
    },
  };
}

export function getStorageKeyPrefix(): string {
  return STORAGE_KEY_PREFIX;
}

export function isFlowStateShape(value: unknown): value is CheckoutFlowState {
  return validateFlowState(value) !== null;
}
