import { makeCtx } from '@spec/factory/flowCtx';

import { createSessionManager } from '@src/core/flow/sessionManager';

describe(`${createSessionManager.name}: server`, () => {
  it('constructs and reads state server-side', () => {
    const { ctx } = makeCtx();
    const sm = createSessionManager(ctx, { onSessionActive: () => undefined });
    expect(sm.getSession()).toBeNull();
    expect(sm.getCreateInFlight()).toBeNull();
  });

  it('createSession runs server-side (onCreateSession invoked)', async () => {
    const onCreateSession = vi.fn(() =>
      Promise.resolve({
        clientSecret: 'cs_test_a_secret_x',
        publishableKey: 'pk_test',
      })
    );
    const { ctx } = makeCtx({ config: { onCreateSession } });
    const sm = createSessionManager(ctx, { onSessionActive: () => undefined });
    const result = await sm.createSession();
    expect(result?.clientSecret).toContain('cs_test_a');
  });
});
