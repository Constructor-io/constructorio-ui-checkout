import { createCheckoutFlow } from '@src/core/createCheckoutFlow';
import { createSessionStorageAdapter } from '@src/core/storage/sessionStorageAdapter';
import type { CheckoutEvent, StorageAdapter } from '@src/core/types';

const stubSession = () =>
  Promise.resolve({ clientSecret: 'cs_test', publishableKey: 'pk_test' });

describe('createCheckoutFlow: storage integration', () => {
  beforeEach(() => {
    globalThis.sessionStorage.clear();
  });

  it('saves state to storage after mutations (debounced)', async () => {
    vi.useFakeTimers();
    const storage = createSessionStorageAdapter();
    const flow = createCheckoutFlow({
      steps: [{ id: 'a' }, { id: 'b' }],
      onCreateSession: stubSession,
      storage,
      storageKey: 'user-1',
      storageSaveDebounceMs: 100,
    });
    await flow.start();
    await flow.next();
    expect(await storage.load('user-1')).toBeNull();
    await vi.advanceTimersByTimeAsync(150);
    const saved = await storage.load('user-1');
    expect(saved?.currentStepId).toBe('b');
    vi.useRealTimers();
    flow.destroy();
  });

  it('auto-resumes from storage on start()', async () => {
    const storage = createSessionStorageAdapter();
    const first = createCheckoutFlow({
      steps: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      onCreateSession: stubSession,
      storage,
      storageKey: 'user-2',
      storageSaveDebounceMs: 0,
    });
    await first.start();
    await first.next();
    await first.next();
    await new Promise((r) => setTimeout(r, 10));
    first.destroy();

    const second = createCheckoutFlow({
      steps: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      onCreateSession: stubSession,
      storage,
      storageKey: 'user-2',
    });
    await second.start();
    expect(second.getState().currentStepId).toBe('c');
    expect(second.getState().completedStepIds).toEqual(['a', 'b']);
    second.destroy();
  });

  it('starts fresh when storageAutoResume is false', async () => {
    const storage = createSessionStorageAdapter();
    await storage.save('user-3', {
      currentStepId: 'c',
      completedStepIds: ['a', 'b'],
      cartSnapshot: [],
      sessionId: null,
      sessionStatus: 'idle',
      metadata: {},
      schemaVersion: 1,
    });
    const flow = createCheckoutFlow({
      steps: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      onCreateSession: stubSession,
      storage,
      storageKey: 'user-3',
      storageAutoResume: false,
    });
    await flow.start();
    expect(flow.getState().currentStepId).toBe('a');
    flow.destroy();
  });

  it('clearState() removes the stored entry and resets in-memory state', async () => {
    const storage = createSessionStorageAdapter();
    const flow = createCheckoutFlow({
      steps: [{ id: 'a' }, { id: 'b' }],
      onCreateSession: stubSession,
      storage,
      storageKey: 'user-4',
      storageSaveDebounceMs: 0,
    });
    await flow.start();
    await flow.next();
    await new Promise((r) => setTimeout(r, 10));
    expect(await storage.load('user-4')).not.toBeNull();
    await flow.clearState();
    expect(await storage.load('user-4')).toBeNull();
    expect(flow.getState().currentStepId).toBeNull();
    flow.destroy();
  });

  it('emits error event when adapter.save rejects', async () => {
    const events: CheckoutEvent[] = [];
    const failing: StorageAdapter = {
      load: () => Promise.resolve(null),
      save: () => Promise.reject(new Error('backend down')),
      clear: () => Promise.resolve(),
    };
    const flow = createCheckoutFlow({
      steps: [{ id: 'a' }, { id: 'b' }],
      onCreateSession: stubSession,
      storage: failing,
      storageKey: 'user-5',
      storageSaveDebounceMs: 0,
      onEvent: (e) => events.push(e),
    });
    await flow.start();
    await new Promise((r) => setTimeout(r, 10));
    const err = events.find((e) => e.type === 'error');
    expect(err).toMatchObject({ type: 'error', source: 'storage' });
    flow.destroy();
  });

  it('emits error event when adapter.load rejects on start', async () => {
    const events: CheckoutEvent[] = [];
    const failing: StorageAdapter = {
      load: () => Promise.reject(new Error('backend down')),
      save: () => Promise.resolve(),
      clear: () => Promise.resolve(),
    };
    const flow = createCheckoutFlow({
      steps: [{ id: 'a' }, { id: 'b' }],
      onCreateSession: stubSession,
      storage: failing,
      storageKey: 'user-6',
      onEvent: (e) => events.push(e),
    });
    await flow.start();
    const err = events.find((e) => e.type === 'error');
    expect(err).toMatchObject({ type: 'error', source: 'storage' });
    expect(flow.getState().currentStepId).toBe('a');
    flow.destroy();
  });

  it('ignores stored state referencing an unknown step id', async () => {
    const storage = createSessionStorageAdapter();
    await storage.save('user-7', {
      currentStepId: 'ghost',
      completedStepIds: [],
      cartSnapshot: [],
      sessionId: null,
      sessionStatus: 'idle',
      metadata: {},
      schemaVersion: 1,
    });
    const events: CheckoutEvent[] = [];
    const flow = createCheckoutFlow({
      steps: [{ id: 'a' }, { id: 'b' }],
      onCreateSession: stubSession,
      storage,
      storageKey: 'user-7',
      onEvent: (e) => events.push(e),
    });
    await flow.start();
    expect(flow.getState().currentStepId).toBe('a');
    expect(events.find((e) => e.type === 'error')).toMatchObject({
      source: 'storage',
    });
    flow.destroy();
  });

  it('destroy cancels pending debounced save', async () => {
    vi.useFakeTimers();
    const savePromises: Promise<void>[] = [];
    const adapter: StorageAdapter = {
      load: () => Promise.resolve(null),
      save: () => {
        const p = Promise.resolve();
        savePromises.push(p);
        return p;
      },
      clear: () => Promise.resolve(),
    };
    const flow = createCheckoutFlow({
      steps: [{ id: 'a' }, { id: 'b' }],
      onCreateSession: stubSession,
      storage: adapter,
      storageKey: 'user-8',
      storageSaveDebounceMs: 500,
    });
    await flow.start();
    flow.destroy();
    await vi.advanceTimersByTimeAsync(1000);
    expect(savePromises.length).toBe(0);
    vi.useRealTimers();
  });
});
