import type { Step } from '../types';

import type { FlowContext } from './context';
import { toError } from './helpers';

export function createGuards<
  TProvider extends string = string,
  TState = unknown,
>(ctx: FlowContext<TProvider, TState>) {
  const runGuard = async (step: Step): Promise<boolean> => {
    if (!step.guard) return true;
    try {
      return await step.guard(ctx.store.getState());
    } catch (reason) {
      ctx.emitError('guard', toError(reason));
      return false;
    }
  };

  const findFirstFailingGuard = async (
    fromIdx: number,
    toIdx: number
  ): Promise<number | null> => {
    for (let i = fromIdx; i <= toIdx; i += 1) {
      const ok = await runGuard(ctx.steps[i]);
      if (ctx.isDestroyed()) return i;
      if (!ok) return i;
    }
    return null;
  };

  return { runGuard, findFirstFailingGuard };
}

export type Guards = ReturnType<typeof createGuards>;
