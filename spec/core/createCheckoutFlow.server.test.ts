import { createCheckoutFlow } from '@src/core/createCheckoutFlow';

const stubSession = () =>
  Promise.resolve({
    clientSecret: 'cs_test_a_secret_x',
    publishableKey: 'pk_test',
  });

describe(`${createCheckoutFlow.name}: server`, () => {
  it('constructs safely without storage or router adapters', () => {
    expect(() =>
      createCheckoutFlow({
        steps: [{ id: 'a' }],
        onCreateSession: stubSession,
      })
    ).not.toThrow();
  });

  it('returns initial state server-side', () => {
    const flow = createCheckoutFlow({
      steps: [{ id: 'a' }, { id: 'b' }],
      onCreateSession: stubSession,
    });
    const state = flow.getState();
    expect(state.currentStepId).toBeNull();
    expect(state.sessionStatus).toBe('idle');
    flow.destroy();
  });

  it('subscribes / unsubscribes safely server-side', () => {
    const flow = createCheckoutFlow({
      steps: [{ id: 'a' }],
      onCreateSession: stubSession,
    });
    const listener = vi.fn();
    const unsubscribe = flow.subscribe(listener);
    expect(() => unsubscribe()).not.toThrow();
    flow.destroy();
  });

  it('deferMount option skips router.subscribe and autoStart', () => {
    const flow = createCheckoutFlow(
      {
        steps: [{ id: 'a' }],
        onCreateSession: stubSession,
        autoStart: true,
      },
      { deferMount: true }
    );
    expect(flow.getState().currentStepId).toBeNull();
    flow.destroy();
  });
});
