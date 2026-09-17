import { makeCtx } from '@spec/factory/flowCtx';

import { createStorageManager } from '@src/core/flow/storageManager';

describe(`${createStorageManager.name}: server`, () => {
  it('constructs server-side when no storage adapter is configured', () => {
    const { ctx } = makeCtx();
    expect(() =>
      createStorageManager(ctx, { hydrate: () => undefined })
    ).not.toThrow();
  });

  it('is disabled and all ops are no-ops without a configured adapter', async () => {
    const { ctx } = makeCtx();
    const sm = createStorageManager(ctx, { hydrate: () => undefined });
    expect(sm.enabled).toBe(false);
    expect(() => sm.scheduleSave()).not.toThrow();
    expect(() => sm.flushSave()).not.toThrow();
    expect(() => sm.flushPendingTimerNow()).not.toThrow();
    expect(() => sm.cancelPending()).not.toThrow();
    expect(await sm.maybeAutoResume()).toBe(false);
    await expect(sm.clearStorage()).resolves.toBeUndefined();
  });
});
