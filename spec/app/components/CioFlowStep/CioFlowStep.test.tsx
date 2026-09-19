import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { CioFlowStep } from '@src/app/components/CioFlowStep';
import { useCioPayment } from '@src/app/hooks/useCioPayment';
import { CioPaymentProvider } from '@src/app/providers/CioPaymentProvider';
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

describe(`${CioFlowStep.name}: client`, () => {
  it('renders children only when its id matches currentStepId', async () => {
    const user = userEvent.setup();
    function App() {
      const flow = useCioPayment();
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
      <CioPaymentProvider {...baseConfig}>
        <App />
      </CioPaymentProvider>
    );
    expect(screen.queryByText('cart-view')).not.toBeInTheDocument();
    await user.click(screen.getByText('start'));
    expect(await screen.findByText('cart-view')).toBeInTheDocument();
    await user.click(screen.getByText('next'));
    expect(await screen.findByText('auth-view')).toBeInTheDocument();
    expect(screen.queryByText('cart-view')).not.toBeInTheDocument();
  });
});
