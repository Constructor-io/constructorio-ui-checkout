import { makeCtx } from '@spec/factory/flowCtx';

import { createCartManager } from '@src/core/flow/cartManager';
import { createSessionManager } from '@src/core/flow/sessionManager';

describe(`${createCartManager.name}: server`, () => {
  it('constructs server-side', () => {
    const { ctx } = makeCtx();
    const session = createSessionManager(ctx, {
      onSessionActive: () => undefined,
    });
    expect(() => createCartManager(ctx, session)).not.toThrow();
  });

  it('setCart updates the store server-side', () => {
    const { ctx } = makeCtx();
    const session = createSessionManager(ctx, {
      onSessionActive: () => undefined,
    });
    const cart = createCartManager(ctx, session);
    expect(() =>
      cart.setCart([{ id: 'x', name: 'X', unitAmount: 1, quantity: 1 }])
    ).not.toThrow();
  });
});
