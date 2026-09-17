import { makeCtx } from '@spec/factory/flowCtx';

import { createGuards } from '@src/core/flow/guards';

describe(`${createGuards.name}: server`, () => {
  it('constructs and runs guards server-side', async () => {
    const { ctx } = makeCtx({
      steps: [{ id: 'a', guard: () => true }],
    });
    const { runGuard, findFirstFailingGuard } = createGuards(ctx);
    expect(await runGuard({ id: 'a', guard: () => true })).toBe(true);
    expect(await findFirstFailingGuard(0, 0)).toBeNull();
  });
});
