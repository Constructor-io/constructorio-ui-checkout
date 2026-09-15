import { validateFlowState } from '@src/core/schema';
import type { FlowState, StorageAdapter } from '@src/core/types';

const STORAGE_KEY_PREFIX = 'cio-checkout-flow:';

// SSR-safe: no window/sessionStorage access at module scope.
const hasSessionStorage = (): boolean => {
  if (typeof globalThis === 'undefined') return false;
  try {
    const storage = (globalThis as { sessionStorage?: Storage }).sessionStorage;
    if (!storage) return false;
    const probe = '__cio_checkout_probe__';
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
};

const namespacedKey = (key: string): string => `${STORAGE_KEY_PREFIX}${key}`;

export function createSessionStorageAdapter(): StorageAdapter {
  return {
    load: (key) => {
      if (!hasSessionStorage()) return Promise.resolve(null);
      const namespaced = namespacedKey(key);
      try {
        const raw = globalThis.sessionStorage.getItem(namespaced);
        if (raw === null) return Promise.resolve(null);
        const parsed: unknown = JSON.parse(raw);
        const validated = validateFlowState(parsed);
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

export function isFlowStateShape(value: unknown): value is FlowState {
  return validateFlowState(value) !== null;
}
