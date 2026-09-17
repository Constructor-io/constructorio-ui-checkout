import {
  createSessionStorageAdapter,
  getStorageKeyPrefix,
  isFlowStateShape,
} from '@src/core/storage/sessionStorageAdapter';
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

const purge = () => {
  const prefix = getStorageKeyPrefix();
  const toDelete: string[] = [];
  for (let i = 0; i < globalThis.sessionStorage.length; i += 1) {
    const key = globalThis.sessionStorage.key(i);
    if (key && key.startsWith(prefix)) toDelete.push(key);
  }
  toDelete.forEach((k) => globalThis.sessionStorage.removeItem(k));
};

describe(`${createSessionStorageAdapter.name}: client`, () => {
  afterEach(() => purge());

  it('round-trips a valid FlowState', async () => {
    const adapter = createSessionStorageAdapter();
    await adapter.save('user-1', valid());
    const loaded = await adapter.load('user-1');
    expect(loaded).toEqual(valid());
  });

  it('returns null for missing keys', async () => {
    const adapter = createSessionStorageAdapter();
    await expect(adapter.load('missing')).resolves.toBeNull();
  });

  it('rejects and clears corrupt JSON without leaking exceptions', async () => {
    const adapter = createSessionStorageAdapter();
    globalThis.sessionStorage.setItem(
      `${getStorageKeyPrefix()}bad`,
      'not-json{'
    );
    await expect(adapter.load('bad')).resolves.toBeNull();
    expect(
      globalThis.sessionStorage.getItem(`${getStorageKeyPrefix()}bad`)
    ).toBeNull();
  });

  it('rejects and clears entries that fail schema validation', async () => {
    const adapter = createSessionStorageAdapter();
    globalThis.sessionStorage.setItem(
      `${getStorageKeyPrefix()}wrong`,
      JSON.stringify({ ...valid(), schemaVersion: 99 })
    );
    await expect(adapter.load('wrong')).resolves.toBeNull();
    expect(
      globalThis.sessionStorage.getItem(`${getStorageKeyPrefix()}wrong`)
    ).toBeNull();
  });

  it('clear() removes only the requested key', async () => {
    const adapter = createSessionStorageAdapter();
    await adapter.save('a', valid());
    await adapter.save('b', valid());
    await adapter.clear('a');
    expect(await adapter.load('a')).toBeNull();
    expect(await adapter.load('b')).not.toBeNull();
  });

  it('save() swallows quota-exceeded errors', async () => {
    const original = globalThis.sessionStorage.setItem.bind(
      globalThis.sessionStorage
    );
    globalThis.sessionStorage.setItem = () => {
      throw new Error('QuotaExceededError');
    };
    const adapter = createSessionStorageAdapter();
    await expect(adapter.save('x', valid())).resolves.toBeUndefined();
    globalThis.sessionStorage.setItem = original;
  });

  it('does not leak keys outside its namespace', async () => {
    const adapter = createSessionStorageAdapter();
    globalThis.sessionStorage.setItem('unrelated', 'data');
    await adapter.save('mine', valid());
    expect(globalThis.sessionStorage.getItem('unrelated')).toBe('data');
    purge();
    expect(globalThis.sessionStorage.getItem('unrelated')).toBe('data');
  });
});

describe(`${isFlowStateShape.name}: client`, () => {
  it('returns true for valid state', () => {
    expect(isFlowStateShape(valid())).toBe(true);
  });

  it('returns false for wrong shape', () => {
    expect(isFlowStateShape({})).toBe(false);
    expect(isFlowStateShape(null)).toBe(false);
    expect(isFlowStateShape([])).toBe(false);
    expect(isFlowStateShape({ ...valid(), schemaVersion: 2 })).toBe(false);
  });
});
