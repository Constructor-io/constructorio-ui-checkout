import type { FlowState } from '../types';

import type { FlowContext } from './context';
import { toError } from './helpers';

export interface StorageManagerOptions {
  hydrate: (state: FlowState) => void;
}

export function createStorageManager<TState>(
  ctx: FlowContext<TState>,
  opts: StorageManagerOptions
) {
  const { config, store, isDestroyed, emitError } = ctx;
  const storage = config.storage;
  const storageKey = config.storageKey;
  const enabled = storage !== undefined && storageKey !== undefined;
  const debounceMs = config.storageSaveDebounceMs ?? 150;

  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  let saveInFlight: Promise<void> | null = null;
  let hasPendingSave = false;
  let lastSavedSerialized: string | null = null;
  let hydrating = false;
  let clearing = false;

  const flushSave = (): void => {
    if (!enabled || isDestroyed() || clearing) return;
    const state = store.getState();
    const serialized = JSON.stringify(state);
    if (serialized === lastSavedSerialized) return;

    if (saveInFlight !== null) {
      hasPendingSave = true;
      return;
    }

    const previousMark = lastSavedSerialized;
    lastSavedSerialized = serialized;
    saveInFlight = storage
      .save(storageKey, state)
      .catch((reason: unknown) => {
        lastSavedSerialized = previousMark;
        emitError('storage', toError(reason));
      })
      .finally(() => {
        saveInFlight = null;
        if (hasPendingSave && !isDestroyed()) {
          hasPendingSave = false;
          flushSave();
        }
      });
  };

  const scheduleSave = (): void => {
    if (!enabled || isDestroyed() || hydrating || clearing) return;
    if (saveTimer !== null) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = null;
      flushSave();
    }, debounceMs);
  };

  const flushPendingTimerNow = (): void => {
    if (!enabled || saveTimer === null) return;
    clearTimeout(saveTimer);
    saveTimer = null;
    flushSave();
  };

  const maybeAutoResume = async (): Promise<boolean> => {
    if (!enabled) return false;
    if (config.storageAutoResume === false) return false;
    try {
      const stored = await storage.load(storageKey);
      if (!stored) return false;
      hydrating = true;
      opts.hydrate(stored);
      hydrating = false;
      lastSavedSerialized = JSON.stringify(store.getState());
      return store.getState().currentStepId !== null;
    } catch (reason) {
      emitError('storage', toError(reason));
      hydrating = false;
      return false;
    }
  };

  const clearStorage = async (): Promise<void> => {
    if (!enabled) return;
    clearing = true;
    try {
      if (saveTimer !== null) {
        clearTimeout(saveTimer);
        saveTimer = null;
      }
      hasPendingSave = false;
      if (saveInFlight !== null) {
        try {
          await saveInFlight;
        } catch {
          /* already emitted */
        }
      }
      lastSavedSerialized = null;
      try {
        await storage.clear(storageKey);
      } catch (reason) {
        if (isDestroyed()) return;
        emitError('storage', toError(reason));
      }
    } finally {
      clearing = false;
    }
  };

  const cancelPending = (): void => {
    if (saveTimer !== null) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    hasPendingSave = false;
  };

  return {
    enabled,
    scheduleSave,
    flushSave,
    flushPendingTimerNow,
    maybeAutoResume,
    clearStorage,
    cancelPending,
  };
}

export type StorageManager = ReturnType<typeof createStorageManager>;
