import { makeCtx } from '@spec/factory/flowCtx';

import { createGuards } from '@src/core/flow/guards';

describe(`${createGuards.name}: client`, () => {
  describe('runGuard', () => {
    it('returns true when a step has no guard', async () => {
      const { ctx } = makeCtx();
      const { runGuard } = createGuards(ctx);
      expect(await runGuard({ id: 'a' })).toBe(true);
    });

    it('returns the guard result when it resolves', async () => {
      const { ctx } = makeCtx();
      const { runGuard } = createGuards(ctx);
      expect(await runGuard({ id: 'a', guard: () => true })).toBe(true);
      expect(await runGuard({ id: 'a', guard: () => false })).toBe(false);
      expect(
        await runGuard({ id: 'a', guard: () => Promise.resolve(true) })
      ).toBe(true);
    });

    it('returns false and emits an error when the guard throws', async () => {
      const { ctx, events } = makeCtx();
      const { runGuard } = createGuards(ctx);
      const result = await runGuard({
        id: 'a',
        guard: () => {
          throw new Error('nope');
        },
      });
      expect(result).toBe(false);
      expect(events).toContainEqual(
        expect.objectContaining({
          type: 'error',
          source: 'guard',
          error: expect.objectContaining({ message: 'nope' }) as unknown,
        })
      );
    });

    it('returns false and emits an error when the guard rejects', async () => {
      const { ctx, events } = makeCtx();
      const { runGuard } = createGuards(ctx);
      const result = await runGuard({
        id: 'a',
        guard: () => Promise.reject(new Error('async nope')),
      });
      expect(result).toBe(false);
      expect(events).toContainEqual(
        expect.objectContaining({ source: 'guard' })
      );
    });
  });

  describe('findFirstFailingGuard', () => {
    it('returns null when all guards pass', async () => {
      const { ctx } = makeCtx({
        steps: [{ id: 'a' }, { id: 'b', guard: () => true }, { id: 'c' }],
      });
      const { findFirstFailingGuard } = createGuards(ctx);
      expect(await findFirstFailingGuard(0, 2)).toBeNull();
    });

    it('returns the index of the first failing guard', async () => {
      const { ctx } = makeCtx({
        steps: [
          { id: 'a' },
          { id: 'b', guard: () => false },
          { id: 'c', guard: () => true },
        ],
      });
      const { findFirstFailingGuard } = createGuards(ctx);
      expect(await findFirstFailingGuard(0, 2)).toBe(1);
    });

    it('short-circuits and returns immediately when destroyed mid-scan', async () => {
      const { ctx, setDestroyed } = makeCtx({
        steps: [
          {
            id: 'a',
            guard: () => {
              setDestroyed(true);
              return true;
            },
          },
          { id: 'b' },
        ],
      });
      const { findFirstFailingGuard } = createGuards(ctx);
      expect(await findFirstFailingGuard(0, 1)).toBe(0);
    });
  });
});
