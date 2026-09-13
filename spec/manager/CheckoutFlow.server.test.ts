import { CheckoutFlow } from '@src/manager/CheckoutFlow';

const stubSession = () =>
  Promise.resolve({
    clientSecret: 'cs_test_a_secret_x',
    publishableKey: 'pk_test',
  });

describe('CheckoutFlow: server (SSR)', () => {
  let originalStorage: Storage | undefined;

  beforeEach(() => {
    originalStorage = globalThis.sessionStorage;
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      value: undefined,
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      value: originalStorage,
    });
  });

  it('is safe to construct without browser globals', () => {
    expect(
      () =>
        new CheckoutFlow({
          steps: [{ id: 'a' }],
          onCreateSession: stubSession,
        })
    ).not.toThrow();
  });

  it('getState returns initial state on the server', () => {
    const flow = new CheckoutFlow({
      steps: [{ id: 'a' }],
      onCreateSession: stubSession,
    });
    const state = flow.getState();
    expect(state.currentStepId).toBeNull();
    expect(state.sessionStatus).toBe('idle');
  });

  it('never touches sessionStorage when no storage adapter is configured', () => {
    const flow = new CheckoutFlow({
      steps: [{ id: 'a' }, { id: 'b' }],
      onCreateSession: stubSession,
    });
    expect(() => flow.getState()).not.toThrow();
    flow.destroy();
  });
});
