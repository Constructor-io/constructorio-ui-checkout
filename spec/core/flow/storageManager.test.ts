import { makeCtx } from '@spec/factory/flowCtx';

import { createStorageManager } from '@src/core/flow/storageManager';
import type { FlowState, StorageAdapter } from '@src/core/types';

function makeAdapter(): {
  adapter: StorageAdapter;
  saved: FlowState[];
  cleared: number;
  resolveSave: () => void;
  rejectSave: (r: unknown) => void;
  setLoadResult: (r: FlowState | null) => void;
} {
  const saved: FlowState[] = [];
  let cleared = 0;
  let saveResolve: () => void = () => {};
  let saveReject: (r: unknown) => void = () => {};
  const saveMode: 'immediate' | 'pending' = 'immediate';
  let loadResult: FlowState | null = null;
  const adapter: StorageAdapter = {
    load: () => Promise.resolve(loadResult),
    save: (_, state) => {
      saved.push(state);
      if (saveMode === 'immediate') return Promise.resolve();
      return new Promise((resolve, reject) => {
        saveResolve = resolve;
        saveReject = reject;
      });
    },
    clear: () => {
      cleared += 1;
      return Promise.resolve();
    },
  };
  return {
    adapter,
    saved,
    get cleared() {
      return cleared;
    },
    resolveSave: () => saveResolve(),
    rejectSave: (r: unknown) => saveReject(r),
    setLoadResult: (r: FlowState | null) => {
      loadResult = r;
    },
  } as unknown as ReturnType<typeof makeAdapter>;
}

describe(`${createStorageManager.name}: client`, () => {
  describe('scheduleSave + flushSave', () => {
    it('is a no-op when storage is not configured', () => {
      const { ctx } = makeCtx();
      const sm = createStorageManager(ctx, { hydrate: () => undefined });
      expect(sm.enabled).toBe(false);
      sm.scheduleSave();
      sm.flushSave();
    });

    it('schedules a debounced save that fires after the debounce window', async () => {
      vi.useFakeTimers();
      const { adapter, saved } = makeAdapter();
      const { ctx } = makeCtx({
        config: {
          storage: adapter,
          storageKey: 'k',
          storageSaveDebounceMs: 100,
        },
      });
      const sm = createStorageManager(ctx, { hydrate: () => undefined });
      ctx.store.setState((prev) => ({ ...prev, currentStepId: 'a' }));
      sm.scheduleSave();
      expect(saved).toHaveLength(0);
      await vi.advanceTimersByTimeAsync(100);
      expect(saved).toHaveLength(1);
      expect(saved[0].currentStepId).toBe('a');
      vi.useRealTimers();
    });

    it('flushPendingTimerNow saves immediately and cancels the timer', () => {
      vi.useFakeTimers();
      const { adapter, saved } = makeAdapter();
      const { ctx } = makeCtx({
        config: {
          storage: adapter,
          storageKey: 'k',
          storageSaveDebounceMs: 500,
        },
      });
      const sm = createStorageManager(ctx, { hydrate: () => undefined });
      ctx.store.setState((prev) => ({ ...prev, currentStepId: 'a' }));
      sm.scheduleSave();
      sm.flushPendingTimerNow();
      expect(saved).toHaveLength(1);
      vi.useRealTimers();
    });

    it('skips flush when serialized state is identical to the last save', async () => {
      vi.useFakeTimers();
      const { adapter, saved } = makeAdapter();
      const { ctx } = makeCtx({
        config: {
          storage: adapter,
          storageKey: 'k',
          storageSaveDebounceMs: 0,
        },
      });
      const sm = createStorageManager(ctx, { hydrate: () => undefined });
      ctx.store.setState((prev) => ({ ...prev, currentStepId: 'a' }));
      sm.scheduleSave();
      await vi.advanceTimersByTimeAsync(0);
      sm.scheduleSave();
      await vi.advanceTimersByTimeAsync(0);
      expect(saved).toHaveLength(1);
      vi.useRealTimers();
    });

    it('emits storage error when save rejects', async () => {
      const rejecting: StorageAdapter = {
        load: () => Promise.resolve(null),
        save: () => Promise.reject(new Error('quota')),
        clear: () => Promise.resolve(),
      };
      const { ctx, events } = makeCtx({
        config: {
          storage: rejecting,
          storageKey: 'k',
          storageSaveDebounceMs: 0,
        },
      });
      const sm = createStorageManager(ctx, { hydrate: () => undefined });
      ctx.store.setState((prev) => ({ ...prev, currentStepId: 'a' }));
      sm.flushSave();
      await Promise.resolve();
      await Promise.resolve();
      expect(events).toContainEqual(
        expect.objectContaining({ source: 'storage' })
      );
    });
  });

  describe('maybeAutoResume', () => {
    it('returns false when storage is disabled', async () => {
      const { ctx } = makeCtx();
      const sm = createStorageManager(ctx, { hydrate: () => undefined });
      expect(await sm.maybeAutoResume()).toBe(false);
    });

    it('returns false when storageAutoResume=false', async () => {
      const { adapter, setLoadResult } = makeAdapter();
      setLoadResult({
        currentStepId: 'b',
        completedStepIds: ['a'],
        cartSnapshot: [],
        sessionId: null,
        sessionStatus: 'idle',
        metadata: {},
        schemaVersion: 1,
      });
      const { ctx } = makeCtx({
        config: {
          storage: adapter,
          storageKey: 'k',
          storageAutoResume: false,
        },
      });
      const sm = createStorageManager(ctx, { hydrate: () => undefined });
      expect(await sm.maybeAutoResume()).toBe(false);
    });

    it('returns false when adapter.load returns null (no saved state)', async () => {
      const { adapter } = makeAdapter();
      const { ctx } = makeCtx({
        config: { storage: adapter, storageKey: 'k' },
      });
      const sm = createStorageManager(ctx, { hydrate: () => undefined });
      expect(await sm.maybeAutoResume()).toBe(false);
    });

    it('calls hydrate and returns true when loaded state has a currentStepId', async () => {
      const { adapter, setLoadResult } = makeAdapter();
      const stored: FlowState = {
        currentStepId: 'b',
        completedStepIds: ['a'],
        cartSnapshot: [],
        sessionId: null,
        sessionStatus: 'idle',
        metadata: {},
        schemaVersion: 1,
      };
      setLoadResult(stored);
      const { ctx } = makeCtx({
        config: { storage: adapter, storageKey: 'k' },
      });
      const hydrate = vi.fn((state: FlowState) => {
        ctx.store.setState(() => state);
      });
      const sm = createStorageManager(ctx, { hydrate });
      const resumed = await sm.maybeAutoResume();
      expect(hydrate).toHaveBeenCalledWith(stored);
      expect(resumed).toBe(true);
    });

    it('emits storage error when adapter.load throws', async () => {
      const throwing: StorageAdapter = {
        load: () => Promise.reject(new Error('read fail')),
        save: () => Promise.resolve(),
        clear: () => Promise.resolve(),
      };
      const { ctx, events } = makeCtx({
        config: { storage: throwing, storageKey: 'k' },
      });
      const sm = createStorageManager(ctx, { hydrate: () => undefined });
      expect(await sm.maybeAutoResume()).toBe(false);
      expect(events).toContainEqual(
        expect.objectContaining({ source: 'storage' })
      );
    });
  });

  describe('clearStorage', () => {
    it('is a no-op when storage is disabled', async () => {
      const { ctx } = makeCtx();
      const sm = createStorageManager(ctx, { hydrate: () => undefined });
      await expect(sm.clearStorage()).resolves.toBeUndefined();
    });

    it('calls adapter.clear', async () => {
      const cleared = vi.fn(() => Promise.resolve());
      const adapter: StorageAdapter = {
        load: () => Promise.resolve(null),
        save: () => Promise.resolve(),
        clear: cleared,
      };
      const { ctx } = makeCtx({
        config: { storage: adapter, storageKey: 'k' },
      });
      const sm = createStorageManager(ctx, { hydrate: () => undefined });
      await sm.clearStorage();
      expect(cleared).toHaveBeenCalledWith('k');
    });

    it('emits storage error when adapter.clear rejects', async () => {
      const adapter: StorageAdapter = {
        load: () => Promise.resolve(null),
        save: () => Promise.resolve(),
        clear: () => Promise.reject(new Error('clear fail')),
      };
      const { ctx, events } = makeCtx({
        config: { storage: adapter, storageKey: 'k' },
      });
      const sm = createStorageManager(ctx, { hydrate: () => undefined });
      await sm.clearStorage();
      expect(events).toContainEqual(
        expect.objectContaining({ source: 'storage' })
      );
    });
  });
});
