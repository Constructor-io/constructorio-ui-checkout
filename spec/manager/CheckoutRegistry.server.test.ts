import { CheckoutFlow } from '@src/manager/CheckoutFlow';
import checkoutRegistry, {
  CheckoutRegistry,
} from '@src/manager/CheckoutRegistry';

describe(`${CheckoutRegistry.name}: server`, () => {
  afterEach(() => {
    checkoutRegistry.clear();
  });

  it('can be imported in a server environment', () => {
    expect(checkoutRegistry).toBeDefined();
  });

  it('hasFlow returns false without any registration', () => {
    expect(checkoutRegistry.hasFlow()).toBe(false);
    expect(checkoutRegistry.getFlow()).toBeNull();
  });

  it('register works without browser globals', () => {
    const flow = new CheckoutFlow({
      steps: [{ id: 'a' }],
      onCreateSession: () =>
        Promise.resolve({
          clientSecret: 'cs_test_a_secret_x',
          publishableKey: 'pk_test',
        }),
    });
    checkoutRegistry.register(flow);
    expect(checkoutRegistry.getFlow()).toBe(flow);
  });
});
