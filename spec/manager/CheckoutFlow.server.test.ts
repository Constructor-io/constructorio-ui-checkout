import { CheckoutFlow } from '@src/manager/CheckoutFlow';

const stubSession = () =>
  Promise.resolve({
    clientSecret: 'cs_test_a_secret_x',
    publishableKey: 'pk_test',
  });

describe(`${CheckoutFlow.name}: server`, () => {
  it('constructs safely server-side without adapters', () => {
    expect(
      () =>
        new CheckoutFlow({
          steps: [{ id: 'a' }],
          onCreateSession: stubSession,
        })
    ).not.toThrow();
  });

  it('returns initial state server-side', () => {
    const flow = new CheckoutFlow({
      steps: [{ id: 'a' }],
      onCreateSession: stubSession,
    });
    expect(flow.getState().currentStepId).toBeNull();
    expect(flow.getState().sessionStatus).toBe('idle');
    flow.destroy();
  });
});
