import { makeCtx } from '@spec/factory/flowCtx';

import { createRouterBridge } from '@src/core/flow/routerBridge';
import { createStorageManager } from '@src/core/flow/storageManager';
import type { RouterAdapter, Step } from '@src/core/types';

function makeRouter(initialPath = '/a'): {
  router: RouterAdapter;
  push: ReturnType<typeof vi.fn>;
  emit: (path: string) => void;
} {
  let current = initialPath;
  let cb: ((p: string) => void) | null = null;
  const push = vi.fn((p: string) => {
    current = p;
  });
  const router: RouterAdapter = {
    push,
    getCurrentPath: () => current,
    subscribe: (fn) => {
      cb = fn;
      return () => {
        cb = null;
      };
    },
  };
  return {
    router,
    push,
    emit: (path) => {
      current = path;
      cb?.(path);
    },
  };
}

describe(`${createRouterBridge.name}: client`, () => {
  describe('push', () => {
    it('is a no-op when no router is configured', () => {
      const { ctx } = makeCtx();
      const storage = createStorageManager(ctx, { hydrate: () => undefined });
      const bridge = createRouterBridge(ctx, storage);
      expect(() => bridge.push('/x')).not.toThrow();
      expect(bridge.hasRouter).toBe(false);
    });

    it('calls router.push with a safe path', () => {
      const { router, push } = makeRouter('');
      const { ctx } = makeCtx({ config: { router } });
      const storage = createStorageManager(ctx, { hydrate: () => undefined });
      const bridge = createRouterBridge(ctx, storage);
      bridge.push('/checkout/payment');
      expect(push).toHaveBeenCalledWith('/checkout/payment');
    });

    it('skips push when current path already matches', () => {
      const { router, push } = makeRouter('/a');
      const { ctx } = makeCtx({ config: { router } });
      const storage = createStorageManager(ctx, { hydrate: () => undefined });
      const bridge = createRouterBridge(ctx, storage);
      bridge.push('/a');
      expect(push).not.toHaveBeenCalled();
    });

    it('rejects unsafe schemes and emits a router error', () => {
      const { router, push } = makeRouter('');
      const { ctx, events } = makeCtx({ config: { router } });
      const storage = createStorageManager(ctx, { hydrate: () => undefined });
      const bridge = createRouterBridge(ctx, storage);
      bridge.push('javascript:alert(1)');
      expect(push).not.toHaveBeenCalled();
      expect(events).toContainEqual(
        expect.objectContaining({
          source: 'router',
          error: expect.objectContaining({
            message: expect.stringContaining('Refused to push') as unknown,
          }) as unknown,
        })
      );
    });

    it('emits router error when router.push throws', () => {
      const throwing: RouterAdapter = {
        push: () => {
          throw new Error('nav fail');
        },
        getCurrentPath: () => '',
      };
      const { ctx, events } = makeCtx({ config: { router: throwing } });
      const storage = createStorageManager(ctx, { hydrate: () => undefined });
      const bridge = createRouterBridge(ctx, storage);
      bridge.push('/x');
      expect(events).toContainEqual(
        expect.objectContaining({ source: 'router' })
      );
    });

    it('does nothing when path is undefined', () => {
      const { router, push } = makeRouter('');
      const { ctx } = makeCtx({ config: { router } });
      const storage = createStorageManager(ctx, { hydrate: () => undefined });
      const bridge = createRouterBridge(ctx, storage);
      bridge.push(undefined);
      expect(push).not.toHaveBeenCalled();
    });
  });

  describe('subscribe', () => {
    const steps: Step[] = [
      { id: 'a', path: '/a' },
      { id: 'b', path: '/b' },
    ];

    it('is a no-op when router has no subscribe', () => {
      const router: RouterAdapter = {
        push: vi.fn(),
        getCurrentPath: () => '/a',
      };
      const { ctx } = makeCtx({ steps, config: { router } });
      const storage = createStorageManager(ctx, { hydrate: () => undefined });
      const bridge = createRouterBridge(ctx, storage);
      expect(() => bridge.subscribe(() => undefined)).not.toThrow();
    });

    it('invokes onExternalPathChange with the matched step', async () => {
      const { router, emit } = makeRouter('/a');
      const { ctx } = makeCtx({ steps, config: { router } });
      const storage = createStorageManager(ctx, { hydrate: () => undefined });
      const bridge = createRouterBridge(ctx, storage);
      const onChange = vi.fn(() => Promise.resolve());
      bridge.subscribe(onChange);
      emit('/b');
      await Promise.resolve();
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'b' })
      );
    });

    it('ignores subscribe fires that match the current step', () => {
      const { router, emit } = makeRouter('/a');
      const { ctx } = makeCtx({ steps, config: { router } });
      ctx.store.setState((prev) => ({ ...prev, currentStepId: 'a' }));
      const storage = createStorageManager(ctx, { hydrate: () => undefined });
      const bridge = createRouterBridge(ctx, storage);
      const onChange = vi.fn();
      bridge.subscribe(onChange);
      emit('/a');
      expect(onChange).not.toHaveBeenCalled();
    });

    it("ignores subscribe fires for paths that don't match any step", () => {
      const { router, emit } = makeRouter('/a');
      const { ctx } = makeCtx({ steps, config: { router } });
      const storage = createStorageManager(ctx, { hydrate: () => undefined });
      const bridge = createRouterBridge(ctx, storage);
      const onChange = vi.fn();
      bridge.subscribe(onChange);
      emit('/unknown');
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('teardown', () => {
    it('unsubscribes from the router adapter', () => {
      const unsubscribe = vi.fn();
      const router: RouterAdapter = {
        push: vi.fn(),
        getCurrentPath: () => '',
        subscribe: () => unsubscribe,
      };
      const { ctx } = makeCtx({ config: { router } });
      const storage = createStorageManager(ctx, { hydrate: () => undefined });
      const bridge = createRouterBridge(ctx, storage);
      bridge.subscribe(() => undefined);
      bridge.teardown();
      expect(unsubscribe).toHaveBeenCalledTimes(1);
    });

    it('swallows unsubscribe errors', () => {
      const router: RouterAdapter = {
        push: vi.fn(),
        getCurrentPath: () => '',
        subscribe: () => () => {
          throw new Error('boom');
        },
      };
      const { ctx } = makeCtx({ config: { router } });
      const storage = createStorageManager(ctx, { hydrate: () => undefined });
      const bridge = createRouterBridge(ctx, storage);
      bridge.subscribe(() => undefined);
      expect(() => bridge.teardown()).not.toThrow();
    });
  });

  describe('getCurrentPath / findStepByPath', () => {
    it('returns empty string when no router', () => {
      const { ctx } = makeCtx();
      const storage = createStorageManager(ctx, { hydrate: () => undefined });
      const bridge = createRouterBridge(ctx, storage);
      expect(bridge.getCurrentPath()).toBe('');
    });

    it('emits router error when router.getCurrentPath throws', () => {
      const throwing: RouterAdapter = {
        push: vi.fn(),
        getCurrentPath: () => {
          throw new Error('read fail');
        },
      };
      const { ctx, events } = makeCtx({ config: { router: throwing } });
      const storage = createStorageManager(ctx, { hydrate: () => undefined });
      const bridge = createRouterBridge(ctx, storage);
      expect(bridge.getCurrentPath()).toBe('');
      expect(events).toContainEqual(
        expect.objectContaining({ source: 'router' })
      );
    });

    it('findStepByPath returns null for unknown paths and the step for known', () => {
      const { ctx } = makeCtx({
        steps: [{ id: 'a', path: '/a' }, { id: 'b' }],
      });
      const storage = createStorageManager(ctx, { hydrate: () => undefined });
      const bridge = createRouterBridge(ctx, storage);
      expect(bridge.findStepByPath('/a')?.id).toBe('a');
      expect(bridge.findStepByPath('/nope')).toBeNull();
    });
  });
});
