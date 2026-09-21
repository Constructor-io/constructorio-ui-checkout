import { createCheckoutFlow } from '@src/core/createCheckoutFlow';
import cioCheckoutRegistry, {
  CioCheckoutRegistry,
} from '@src/manager/CioCheckoutRegistry';

describe(`${CioCheckoutRegistry.name}: server`, () => {
  afterEach(() => {
    cioCheckoutRegistry.clear();
  });

  it('can be imported in a server environment', () => {
    expect(cioCheckoutRegistry).toBeDefined();
  });

  it('hasFlow returns false without any registration', () => {
    expect(cioCheckoutRegistry.hasFlow()).toBe(false);
    expect(cioCheckoutRegistry.getFlow()).toBeNull();
  });

  it('register works without browser globals', () => {
    const flow = createCheckoutFlow({
      provider: 'stripe',
      steps: [{ id: 'a' }],
      onCreateSession: () =>
        Promise.resolve({
          clientSecret: 'cs_test_a_secret_x',
          publishableKey: 'pk_test',
        }),
    });
    cioCheckoutRegistry.register(flow);
    expect(cioCheckoutRegistry.getFlow()).toBe(flow);
  });
});
