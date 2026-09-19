import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { CioFlowStep } from '@src/app/components/CioFlowStep';
import { useCioCheckout } from '@src/app/hooks/useCioCheckout';
import { CioCheckoutProvider } from '@src/app/providers/CioCheckoutProvider';
import type { CheckoutFlowConfig } from '@src/core/types';

const stubSession = () =>
  Promise.resolve({
    clientSecret: 'cs_test_a_secret_x',
    publishableKey: 'pk_test',
  });

const baseConfig: CheckoutFlowConfig = {
  provider: 'stripe',
  steps: [{ id: 'cart' }, { id: 'auth' }, { id: 'pay' }],
  onCreateSession: stubSession,
};

describe(`${CioFlowStep.name}: client`, () => {
  it('renders children only when its id matches currentStepId', async () => {
    const user = userEvent.setup();
    function App() {
      const flow = useCioCheckout();
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
          <CioFlowStep id="cart">cart-view</CioFlowStep>
          <CioFlowStep id="auth">auth-view</CioFlowStep>
          <CioFlowStep id="pay">pay-view</CioFlowStep>
        </>
      );
    }
    render(
      <CioCheckoutProvider {...baseConfig}>
        <App />
      </CioCheckoutProvider>
    );
    expect(screen.queryByText('cart-view')).not.toBeInTheDocument();
    await user.click(screen.getByText('start'));
    expect(await screen.findByText('cart-view')).toBeInTheDocument();
    await user.click(screen.getByText('next'));
    expect(await screen.findByText('auth-view')).toBeInTheDocument();
    expect(screen.queryByText('cart-view')).not.toBeInTheDocument();
  });
});
