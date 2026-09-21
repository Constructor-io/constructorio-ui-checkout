import { makeCtx } from '@spec/factory/flowCtx';

import { createNavigator } from '@src/core/flow/navigator';
import { createRouterBridge } from '@src/core/flow/routerBridge';
import { createStorageManager } from '@src/core/flow/storageManager';
import type { CheckoutRouterAdapter, CheckoutStep } from '@src/core/types';

function wire(
  options: { steps?: CheckoutStep[]; router?: CheckoutRouterAdapter } = {}
) {
  const ctxWrap = makeCtx({
    steps: options.steps,
    config: options.router ? { router: options.router } : undefined,
  });
  const storage = createStorageManager(ctxWrap.ctx, {
    hydrate: () => undefined,
  });
  const router = createRouterBridge(ctxWrap.ctx, storage);
  const nav = createNavigator(ctxWrap.ctx, storage, router);
  return { ...ctxWrap, storage, router, nav };
}

describe(`${createNavigator.name}: client`, () => {
  describe('start', () => {
    it('enters the first step and emits flow.started', async () => {
      const { ctx, events, nav } = wire({
        steps: [{ id: 'a' }, { id: 'b' }],
      });
      await nav.start();
      expect(ctx.store.getState().currentStepId).toBe('a');
      expect(events.map((e) => e.type)).toContain('flow.started');
    });

    it('coalesces concurrent start calls', async () => {
      const guardCalls = vi.fn(() => true);
      const { nav } = wire({
        steps: [{ id: 'a', guard: guardCalls }],
      });
      await Promise.all([nav.start(), nav.start()]);
      expect(guardCalls).toHaveBeenCalledTimes(1);
    });

    it('does not re-enter when already started', async () => {
      const { ctx, nav } = wire({ steps: [{ id: 'a' }, { id: 'b' }] });
      await nav.start();
      await nav.next();
      await nav.start();
      expect(ctx.store.getState().currentStepId).toBe('b');
    });

    it('runs authenticate before starting', async () => {
      const authenticate = vi.fn(() => Promise.resolve({ userId: 'u' }));
      const ctxWrap = makeCtx({
        steps: [{ id: 'a' }],
        config: { authenticate },
      });
      const storage = createStorageManager(ctxWrap.ctx, {
        hydrate: () => undefined,
      });
      const router = createRouterBridge(ctxWrap.ctx, storage);
      const nav = createNavigator(ctxWrap.ctx, storage, router);
      await nav.start();
      expect(authenticate).toHaveBeenCalled();
    });

    it('emits authenticate error and does not start when authenticate returns null', async () => {
      const ctxWrap = makeCtx({
        steps: [{ id: 'a' }],
        config: { authenticate: () => Promise.resolve(null) },
      });
      const storage = createStorageManager(ctxWrap.ctx, {
        hydrate: () => undefined,
      });
      const router = createRouterBridge(ctxWrap.ctx, storage);
      const nav = createNavigator(ctxWrap.ctx, storage, router);
      await nav.start();
      expect(ctxWrap.ctx.store.getState().currentStepId).toBeNull();
      expect(ctxWrap.events).toContainEqual(
        expect.objectContaining({ source: 'authenticate' })
      );
    });

    it('emits authenticate error when authenticate throws', async () => {
      const ctxWrap = makeCtx({
        steps: [{ id: 'a' }],
        config: { authenticate: () => Promise.reject(new Error('nope')) },
      });
      const storage = createStorageManager(ctxWrap.ctx, {
        hydrate: () => undefined,
      });
      const router = createRouterBridge(ctxWrap.ctx, storage);
      const nav = createNavigator(ctxWrap.ctx, storage, router);
      await nav.start();
      expect(ctxWrap.ctx.store.getState().currentStepId).toBeNull();
      expect(ctxWrap.events).toContainEqual(
        expect.objectContaining({ source: 'authenticate' })
      );
    });

    it('does not enter when the first step guard rejects', async () => {
      const { ctx, nav } = wire({
        steps: [{ id: 'a', guard: () => false }, { id: 'b' }],
      });
      await nav.start();
      expect(ctx.store.getState().currentStepId).toBeNull();
    });

    it('with router: enters the URL-matched step after guards pass', async () => {
      let current = '/b';
      const router: CheckoutRouterAdapter = {
        push: (p) => {
          current = p;
        },
        getCurrentPath: () => current,
      };
      const { ctx, nav } = wire({
        steps: [
          { id: 'a', path: '/a' },
          { id: 'b', path: '/b' },
        ],
        router,
      });
      await nav.start();
      expect(ctx.store.getState().currentStepId).toBe('b');
    });

    it('with router: emits guard error naming failing prerequisite', async () => {
      let current = '/c';
      const router: CheckoutRouterAdapter = {
        push: (p) => {
          current = p;
        },
        getCurrentPath: () => current,
      };
      const { ctx, events, nav } = wire({
        steps: [
          { id: 'a', path: '/a', guard: () => false },
          { id: 'b', path: '/b' },
          { id: 'c', path: '/c' },
        ],
        router,
      });
      await nav.start();
      expect(ctx.store.getState().currentStepId).toBeNull();
      expect(events).toContainEqual(
        expect.objectContaining({
          source: 'guard',
          error: expect.objectContaining({
            message: expect.stringContaining('prerequisite') as unknown,
          }) as unknown,
        })
      );
    });
  });

  describe('next', () => {
    it('advances to the next step', async () => {
      const { ctx, nav } = wire({ steps: [{ id: 'a' }, { id: 'b' }] });
      await nav.start();
      await nav.next();
      expect(ctx.store.getState().currentStepId).toBe('b');
    });

    it('auto-starts when called before start()', async () => {
      const { ctx, nav } = wire({ steps: [{ id: 'a' }, { id: 'b' }] });
      await nav.next();
      expect(ctx.store.getState().currentStepId).toBe('a');
    });

    it('emits guard error when trying to skip a required step', async () => {
      const { events, nav } = wire({ steps: [{ id: 'a' }, { id: 'b' }] });
      await nav.start();
      await nav.next({ skip: true });
      expect(events).toContainEqual(
        expect.objectContaining({
          source: 'guard',
          error: expect.objectContaining({
            message: expect.stringContaining('Cannot skip') as unknown,
          }) as unknown,
        })
      );
    });

    it('emits flow.completed when calling next past the last step', async () => {
      const { events, nav } = wire({ steps: [{ id: 'a' }] });
      await nav.start();
      await nav.next();
      expect(events.map((e) => e.type)).toContain('flow.completed');
    });

    it("blocks advance when the next step's guard rejects", async () => {
      const { ctx, nav } = wire({
        steps: [{ id: 'a' }, { id: 'b', guard: () => false }],
      });
      await nav.start();
      await nav.next();
      expect(ctx.store.getState().currentStepId).toBe('a');
    });
  });

  describe('back', () => {
    it('returns to the previous step and un-completes it', async () => {
      const { ctx, nav } = wire({ steps: [{ id: 'a' }, { id: 'b' }] });
      await nav.start();
      await nav.next();
      await nav.back();
      expect(ctx.store.getState().currentStepId).toBe('a');
      expect(ctx.store.getState().completedStepIds).not.toContain('a');
    });

    it('is a no-op at the first step', async () => {
      const { ctx, nav } = wire({ steps: [{ id: 'a' }, { id: 'b' }] });
      await nav.start();
      await nav.back();
      expect(ctx.store.getState().currentStepId).toBe('a');
    });
  });

  describe('goTo', () => {
    it('jumps directly to a step by id', async () => {
      const { ctx, nav } = wire({
        steps: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      });
      await nav.start();
      await nav.goTo('c');
      expect(ctx.store.getState().currentStepId).toBe('c');
    });

    it('emits guard error for unknown step id', async () => {
      const { events, nav } = wire({ steps: [{ id: 'a' }, { id: 'b' }] });
      await nav.start();
      await nav.goTo('nope');
      expect(events).toContainEqual(
        expect.objectContaining({
          source: 'guard',
          error: expect.objectContaining({
            message: expect.stringContaining('Unknown step id') as unknown,
          }) as unknown,
        })
      );
    });

    it('emits guard error and blocks jump when target guard rejects', async () => {
      const { ctx, events, nav } = wire({
        steps: [{ id: 'a' }, { id: 'b', guard: () => false }],
      });
      await nav.start();
      await nav.goTo('b');
      expect(ctx.store.getState().currentStepId).toBe('a');
      expect(events).toContainEqual(
        expect.objectContaining({ source: 'guard' })
      );
    });

    it('emits flow.started when called before start()', async () => {
      const { events, nav } = wire({ steps: [{ id: 'a' }, { id: 'b' }] });
      await nav.goTo('b');
      expect(events.map((e) => e.type)).toContain('flow.started');
    });

    it('is a no-op when target equals current step', async () => {
      const { events, nav } = wire({ steps: [{ id: 'a' }, { id: 'b' }] });
      await nav.start();
      const before = events.length;
      await nav.goTo('a');
      const emittedAfter = events.slice(before).map((e) => e.type);
      expect(emittedAfter).not.toContain('step.entered');
      expect(emittedAfter).not.toContain('step.exited');
    });

    it('bails out when destroyed mid-guard', async () => {
      let resolveGuard: (v: boolean) => void = () => {};
      const ctxWrap = makeCtx({
        steps: [
          { id: 'a' },
          {
            id: 'b',
            guard: () =>
              new Promise<boolean>((resolve) => {
                resolveGuard = resolve;
              }),
          },
        ],
      });
      const storage = createStorageManager(ctxWrap.ctx, {
        hydrate: () => undefined,
      });
      const router = createRouterBridge(ctxWrap.ctx, storage);
      const nav = createNavigator(ctxWrap.ctx, storage, router);
      await nav.start();
      const jump = nav.goTo('b');
      ctxWrap.setDestroyed(true);
      resolveGuard(true);
      await jump;
      // Destroyed before commit; state should not have advanced.
      expect(ctxWrap.ctx.store.getState().currentStepId).toBe('a');
    });

    it('jumps backward and removes the destination from completedStepIds', async () => {
      const { ctx, events, nav } = wire({
        steps: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      });
      await nav.start();
      await nav.next();
      await nav.next();
      // now on c, completed: [a, b]
      const beforeGoTo = events.length;
      await nav.goTo('a');
      expect(ctx.store.getState().currentStepId).toBe('a');
      expect(ctx.store.getState().completedStepIds).not.toContain('a');
      // only one exit event (from current), no exitStep chain
      const exited = events
        .slice(beforeGoTo)
        .filter((e) => e.type === 'step.exited');
      expect(exited).toHaveLength(1);
    });
  });

  describe('complete', () => {
    it('emits flow.completed', () => {
      const { events, nav } = wire({ steps: [{ id: 'a' }] });
      nav.complete();
      expect(events.map((e) => e.type)).toContain('flow.completed');
    });
  });

  describe('resume + guard validation', () => {
    it('emits guard error and resets to failing step when a resumed guard fails', async () => {
      const ctxWrap = makeCtx({
        steps: [{ id: 'a' }, { id: 'b', guard: () => false }, { id: 'c' }],
        config: {
          storage: {
            load: () =>
              Promise.resolve({
                currentStepId: 'c',
                completedStepIds: ['a', 'b'],
                cartSnapshot: [],
                currency: null,
                sessionId: null,
                sessionStatus: 'idle',
                metadata: {},
                schemaVersion: 1,
              }),
            save: () => Promise.resolve(),
            clear: () => Promise.resolve(),
          },
          storageKey: 'resume-guard-fail',
        },
      });
      const storage = createStorageManager(ctxWrap.ctx, {
        hydrate: (stored) => ctxWrap.ctx.store.setState(() => stored),
      });
      const router = createRouterBridge(ctxWrap.ctx, storage);
      const nav = createNavigator(ctxWrap.ctx, storage, router);
      await nav.start();
      expect(ctxWrap.events).toContainEqual(
        expect.objectContaining({
          source: 'guard',
          error: expect.objectContaining({
            message: expect.stringContaining('resume:') as unknown,
          }) as unknown,
        })
      );
      expect(ctxWrap.ctx.store.getState().currentStepId).toBe('b');
      expect(ctxWrap.ctx.store.getState().completedStepIds).toEqual(['a']);
    });
  });
});
