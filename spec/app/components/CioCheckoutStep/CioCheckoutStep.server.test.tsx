import { renderToString } from 'react-dom/server';

import { CioCheckoutStep } from '@src/app/components/CioCheckoutStep';
import { CioCheckoutProvider } from '@src/app/providers/CioCheckoutProvider';

const stubSession = () =>
  Promise.resolve({
    clientSecret: 'cs_test_a_secret_x',
    publishableKey: 'pk_test',
  });

describe(`${CioCheckoutStep.name}: server`, () => {
  it('renders nothing on the server when the flow has not started', () => {
    const view = renderToString(
      <CioCheckoutProvider
        provider="stripe"
        steps={[{ id: 'cart' }]}
        onCreateSession={stubSession}
      >
        <CioCheckoutStep id="cart">
          <span data-testid="cart">cart</span>
        </CioCheckoutStep>
      </CioCheckoutProvider>
    );
    expect(view).not.toContain('data-testid="cart"');
  });
});
