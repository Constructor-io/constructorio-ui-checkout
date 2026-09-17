import { makeCtx } from '@spec/factory/flowCtx';

import { createNavigator } from '@src/core/flow/navigator';
import { createRouterBridge } from '@src/core/flow/routerBridge';
import { createStorageManager } from '@src/core/flow/storageManager';

describe(`${createNavigator.name}: server`, () => {
  it('constructs server-side without storage or router adapters', () => {
    const { ctx } = makeCtx();
    const storage = createStorageManager(ctx, { hydrate: () => undefined });
    const router = createRouterBridge(ctx, storage);
    expect(() => createNavigator(ctx, storage, router)).not.toThrow();
  });

  it('start() enters the first step server-side', async () => {
    const { ctx } = makeCtx({ steps: [{ id: 'a' }] });
    const storage = createStorageManager(ctx, { hydrate: () => undefined });
    const router = createRouterBridge(ctx, storage);
    const nav = createNavigator(ctx, storage, router);
    await nav.start();
    expect(ctx.store.getState().currentStepId).toBe('a');
  });
});
