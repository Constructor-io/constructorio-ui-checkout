import { createSessionStorageAdapter } from '@src/core/storage/sessionStorageAdapter';
import type { FlowState } from '@src/core/types';
import { FLOW_SCHEMA_VERSION } from '@src/core/types';

const valid = (): FlowState => ({
  currentStepId: 'a',
  completedStepIds: [],
  cartSnapshot: [],
  sessionId: null,
  sessionStatus: 'idle',
  metadata: {},
  schemaVersion: FLOW_SCHEMA_VERSION,
});

describe(`${createSessionStorageAdapter.name}: server`, () => {
  let originalStorage: Storage | undefined;

  beforeEach(() => {
    originalStorage = globalThis.sessionStorage;
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      value: undefined,
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      value: originalStorage,
    });
  });

  it('is safe to construct without sessionStorage', () => {
    expect(() => createSessionStorageAdapter()).not.toThrow();
  });

  it('load() resolves to null with no storage backend', async () => {
    const adapter = createSessionStorageAdapter();
    await expect(adapter.load('anything')).resolves.toBeNull();
  });

  it('save() resolves quietly with no storage backend', async () => {
    const adapter = createSessionStorageAdapter();
    await expect(adapter.save('anything', valid())).resolves.toBeUndefined();
  });

  it('clear() resolves quietly with no storage backend', async () => {
    const adapter = createSessionStorageAdapter();
    await expect(adapter.clear('anything')).resolves.toBeUndefined();
  });

  it('tolerates a sessionStorage that throws on setItem', async () => {
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      value: {
        getItem: () => null,
        setItem: () => {
          throw new Error('private mode');
        },
        removeItem: () => {
          /* noop */
        },
        length: 0,
        clear: () => {
          /* noop */
        },
        key: () => null,
      } satisfies Storage,
    });
    const adapter = createSessionStorageAdapter();
    await expect(adapter.load('x')).resolves.toBeNull();
    await expect(adapter.save('x', valid())).resolves.toBeUndefined();
  });
});
