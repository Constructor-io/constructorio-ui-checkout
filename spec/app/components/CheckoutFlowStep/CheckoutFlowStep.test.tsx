import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { CheckoutFlowStep } from '@src/app/components/CheckoutFlowStep';
import { useCheckoutFlow } from '@src/app/hooks/useCheckoutFlow';
import { CheckoutFlowProvider } from '@src/app/providers/CheckoutFlowProvider';
import type { CheckoutFlowConfig } from '@src/core/types';

const stubSession = () =>
  Promise.resolve({
    clientSecret: 'cs_test_a_secret_x',
    publishableKey: 'pk_test',
  });

const baseConfig: CheckoutFlowConfig = {
  steps: [{ id: 'cart' }, { id: 'auth' }, { id: 'pay' }],
  onCreateSession: stubSession,
};

describe(`${CheckoutFlowStep.name}: client`, () => {
  it('renders children only when its id matches currentStepId', async () => {
    const user = userEvent.setup();
    function App() {
      const flow = useCheckoutFlow();
      return (
        <>
          <button
            type="button"
            onClick={() => {
              void flow.start();
            }}
          >
            start
          </button>
          <button
            type="button"
            onClick={() => {
              void flow.next();
            }}
          >
            next
          </button>
          <CheckoutFlowStep id="cart">cart-view</CheckoutFlowStep>
          <CheckoutFlowStep id="auth">auth-view</CheckoutFlowStep>
          <CheckoutFlowStep id="pay">pay-view</CheckoutFlowStep>
        </>
      );
    }
    render(
      <CheckoutFlowProvider {...baseConfig}>
        <App />
      </CheckoutFlowProvider>
    );
    expect(screen.queryByText('cart-view')).not.toBeInTheDocument();
    await user.click(screen.getByText('start'));
    expect(await screen.findByText('cart-view')).toBeInTheDocument();
    await user.click(screen.getByText('next'));
    expect(await screen.findByText('auth-view')).toBeInTheDocument();
    expect(screen.queryByText('cart-view')).not.toBeInTheDocument();
  });
});
