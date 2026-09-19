import { renderToString } from 'react-dom/server';

import { CioFlowStep } from '@src/app/components/CioFlowStep';
import { CioCheckoutProvider } from '@src/app/providers/CioCheckoutProvider';

const stubSession = () =>
  Promise.resolve({
    clientSecret: 'cs_test_a_secret_x',
    publishableKey: 'pk_test',
  });

describe(`${CioFlowStep.name}: server`, () => {
  it('renders nothing on the server when the flow has not started', () => {
    const view = renderToString(
      <CioCheckoutProvider
        provider="stripe"
        steps={[{ id: 'cart' }]}
        onCreateSession={stubSession}
      >
        <CioFlowStep id="cart">
          <span data-testid="cart">cart</span>
        </CioFlowStep>
      </CioCheckoutProvider>
    );
    expect(view).not.toContain('data-testid="cart"');
  });
});
