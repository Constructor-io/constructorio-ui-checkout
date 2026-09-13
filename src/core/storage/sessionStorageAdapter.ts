import { validateFlowState } from '@src/core/schema';
import type { FlowState, StorageAdapter } from '@src/core/types';

const STORAGE_KEY_PREFIX = 'cio-checkout-flow:';

// SSR-safe: no window/sessionStorage access at module scope.
const hasSessionStorage = (): boolean => {
  if (typeof globalThis === 'undefined') return false;
  const g = globalThis as { sessionStorage?: Storage };
  if (!g.sessionStorage) return false;
  // Private-browsing and sandboxed iframes throw on any access; probe once.
  try {
    const probe = '__cio_checkout_probe__';
    g.sessionStorage.setItem(probe, '1');
    g.sessionStorage.removeItem(probe);
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
      try {
        const raw = globalThis.sessionStorage.getItem(namespacedKey(key));
        if (raw === null) return Promise.resolve(null);
        const parsed: unknown = JSON.parse(raw);
        const validated = validateFlowState(parsed);
        if (!validated) {
          globalThis.sessionStorage.removeItem(namespacedKey(key));
          return Promise.resolve(null);
        }
        return Promise.resolve(validated);
      } catch {
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
      } catch {
        // Quota exceeded or serialization failure — the flow surfaces it via
        // onEvent('error', source: 'storage'); no need to re-throw here.
      }
      return Promise.resolve();
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
