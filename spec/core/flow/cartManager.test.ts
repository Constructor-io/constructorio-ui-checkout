import { makeCtx } from '@spec/factory/flowCtx';

import { createCartManager } from '@src/core/flow/cartManager';
import { createSessionManager } from '@src/core/flow/sessionManager';
import type { CheckoutSessionResponse } from '@src/types';

const goodResponse = (id = 'cs_test_abc'): CheckoutSessionResponse => ({
  clientSecret: `${id}_secret_xyz`,
  publishableKey: 'pk_test',
});

describe(`${createCartManager.name}: client`, () => {
  describe('setCart', () => {
    it('is a no-op when items are content-identical to the current snapshot', () => {
      vi.useFakeTimers();
      const onUpdateSession = vi.fn(() => Promise.resolve(goodResponse()));
      const { ctx } = makeCtx({
        config: {
          onCreateSession: () => Promise.resolve(goodResponse()),
          onUpdateSession,
        },
      });
      ctx.store.setState((prev) => ({
        ...prev,
        cartSnapshot: [{ name: 'A', amount: 10 }],
      }));
      const session = createSessionManager(ctx, {
        onSessionActive: () => undefined,
      });
      const cart = createCartManager(ctx, session);
      cart.setCart([{ name: 'A', amount: 10 }]);
      expect(cart.hasPending()).toBe(false);
      vi.useRealTimers();
    });

    it('debounces multiple calls and flushes once after the window', async () => {
      vi.useFakeTimers();
      const onUpdateSession = vi.fn(() => Promise.resolve(goodResponse()));
      const { ctx } = makeCtx({
        config: {
          onCreateSession: () => Promise.resolve(goodResponse()),
          onUpdateSession,
          cartDebounceMs: 100,
        },
      });
      const session = createSessionManager(ctx, {
        onSessionActive: () => undefined,
      });
      await session.createSession();
      const cart = createCartManager(ctx, session);
      cart.setCart([{ name: 'A', amount: 1 }]);
      cart.setCart([
        { name: 'A', amount: 1 },
        { name: 'B', amount: 2 },
      ]);
      await vi.advanceTimersByTimeAsync(150);
      expect(onUpdateSession).toHaveBeenCalledTimes(1);
      vi.useRealTimers();
    });

    it('flushes synchronously when debounceMs = 0', async () => {
      const onUpdateSession = vi.fn(() => Promise.resolve(goodResponse()));
      const { ctx } = makeCtx({
        config: {
          onCreateSession: () => Promise.resolve(goodResponse()),
          onUpdateSession,
          cartDebounceMs: 0,
        },
      });
      const session = createSessionManager(ctx, {
        onSessionActive: () => undefined,
      });
      await session.createSession();
      const cart = createCartManager(ctx, session);
      cart.setCart([{ name: 'X', amount: 1 }]);
      await Promise.resolve();
      expect(onUpdateSession).toHaveBeenCalled();
    });
  });

  describe('syncCart', () => {
    it('updates the local snapshot and returns null when no session', async () => {
      const { ctx } = makeCtx();
      const session = createSessionManager(ctx, {
        onSessionActive: () => undefined,
      });
      const cart = createCartManager(ctx, session);
      const result = await cart.syncCart([{ name: 'A', amount: 5 }]);
      expect(result).toBeNull();
      expect(ctx.store.getState().cartSnapshot).toEqual([
        { name: 'A', amount: 5 },
      ]);
    });

    it('chains through an in-flight createSession and applies the update after', async () => {
      let resolveCreate: (r: CheckoutSessionResponse) => void = () => {};
      const onCreateSession = vi.fn(
        () =>
          new Promise<CheckoutSessionResponse>((resolve) => {
            resolveCreate = resolve;
          })
      );
      const onUpdateSession = vi.fn(() =>
        Promise.resolve(goodResponse('cs_test_upd'))
      );
      const { ctx } = makeCtx({
        config: { onCreateSession, onUpdateSession },
      });
      const session = createSessionManager(ctx, {
        onSessionActive: () => undefined,
      });
      const cart = createCartManager(ctx, session);
      void session.createSession();
      const p = cart.syncCart([{ name: 'X', amount: 1 }]);
      resolveCreate(goodResponse('cs_test_new'));
      await p;
      expect(onUpdateSession).toHaveBeenCalledWith(
        expect.objectContaining({ items: [{ name: 'X', amount: 1 }] })
      );
    });

    it('calls updateSession immediately when session exists', async () => {
      const onUpdateSession = vi.fn(() =>
        Promise.resolve(goodResponse('cs_test_upd'))
      );
      const { ctx } = makeCtx({
        config: {
          onCreateSession: () => Promise.resolve(goodResponse()),
          onUpdateSession,
        },
      });
      const session = createSessionManager(ctx, {
        onSessionActive: () => undefined,
      });
      await session.createSession();
      const cart = createCartManager(ctx, session);
      await cart.syncCart([{ name: 'X', amount: 1 }]);
      expect(onUpdateSession).toHaveBeenCalledWith(
        expect.objectContaining({ items: [{ name: 'X', amount: 1 }] })
      );
    });
  });

  describe('cancel + clearDebounce', () => {
    it('cancel clears pending items and the timer', () => {
      vi.useFakeTimers();
      const onUpdateSession = vi.fn(() => Promise.resolve(goodResponse()));
      const { ctx } = makeCtx({
        config: {
          onCreateSession: () => Promise.resolve(goodResponse()),
          onUpdateSession,
          cartDebounceMs: 100,
        },
      });
      const session = createSessionManager(ctx, {
        onSessionActive: () => undefined,
      });
      const cart = createCartManager(ctx, session);
      cart.setCart([{ name: 'A', amount: 1 }]);
      expect(cart.hasPending()).toBe(true);
      cart.cancel();
      expect(cart.hasPending()).toBe(false);
      vi.useRealTimers();
    });
  });
});
