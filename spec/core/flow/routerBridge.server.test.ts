import { makeCtx } from '@spec/factory/flowCtx';

import { createRouterBridge } from '@src/core/flow/routerBridge';
import { createStorageManager } from '@src/core/flow/storageManager';

describe(`${createRouterBridge.name}: server`, () => {
  it('constructs server-side without a router adapter', () => {
    const { ctx } = makeCtx();
    const storage = createStorageManager(ctx, { hydrate: () => undefined });
    expect(() => createRouterBridge(ctx, storage)).not.toThrow();
  });

  it('push/subscribe/teardown are no-ops without a router', () => {
    const { ctx } = makeCtx();
    const storage = createStorageManager(ctx, { hydrate: () => undefined });
    const bridge = createRouterBridge(ctx, storage);
    expect(() => bridge.push('/x')).not.toThrow();
    expect(() => bridge.subscribe(() => undefined)).not.toThrow();
    expect(() => bridge.teardown()).not.toThrow();
    expect(bridge.getCurrentPath()).toBe('');
    expect(bridge.hasRouter).toBe(false);
  });
});
