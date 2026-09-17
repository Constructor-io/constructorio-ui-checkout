import { renderToString } from 'react-dom/server';

import { CheckoutFlowStep } from '@src/app/components/CheckoutFlowStep';
import { CheckoutFlowProvider } from '@src/app/providers/CheckoutFlowProvider';

const stubSession = () =>
  Promise.resolve({
    clientSecret: 'cs_test_a_secret_x',
    publishableKey: 'pk_test',
  });

describe(`${CheckoutFlowStep.name}: server`, () => {
  it('renders nothing on the server when the flow has not started', () => {
    const view = renderToString(
      <CheckoutFlowProvider
        steps={[{ id: 'cart' }]}
        onCreateSession={stubSession}
      >
        <CheckoutFlowStep id="cart">
          <span data-testid="cart">cart</span>
        </CheckoutFlowStep>
      </CheckoutFlowProvider>
    );
    expect(view).not.toContain('data-testid="cart"');
  });
});
