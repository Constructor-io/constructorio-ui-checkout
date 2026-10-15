import { renderToString } from 'react-dom/server';

import { CioCheckoutStep } from '@src/app/components/CioCheckoutStep';
import { CioStripePaymentStep } from '@src/app/components/CioStripePaymentStep';
import { CioCheckoutProvider } from '@src/app/providers/CioCheckoutProvider';
import { PAYMENT_STEP } from '@src/core/types';

const stubSession = () =>
  Promise.resolve({
    clientSecret: 'cs_test_a_secret_x',
    publishableKey: 'pk_test',
  });

describe(`${CioStripePaymentStep.name}: server`, () => {
  it('is safe to render inside a Provider server-side', () => {
    expect(() =>
      renderToString(
        <CioCheckoutProvider
          provider="stripe"
          steps={[{ id: PAYMENT_STEP }]}
          onCreateSession={stubSession}
        >
          <CioCheckoutStep id={PAYMENT_STEP}>
            <CioStripePaymentStep />
          </CioCheckoutStep>
        </CioCheckoutProvider>
      )
    ).not.toThrow();
  });

  it('renders nothing before the flow enters the stripe step', () => {
    const view = renderToString(
      <CioCheckoutProvider
        provider="stripe"
        steps={[{ id: PAYMENT_STEP }]}
        onCreateSession={stubSession}
      >
        <CioCheckoutStep id={PAYMENT_STEP}>
          <CioStripePaymentStep />
        </CioCheckoutStep>
      </CioCheckoutProvider>
    );
    expect(view).not.toContain('stripe-provider');
  });

  it('renders the loader when there is no session yet', () => {
    const view = renderToString(
      <CioCheckoutProvider
        provider="stripe"
        steps={[{ id: PAYMENT_STEP }]}
        onCreateSession={stubSession}
      >
        <CioStripePaymentStep />
      </CioCheckoutProvider>
    );
    expect(view).toContain('cio-checkout-loader');
    expect(view).toContain('Preparing checkout...');
  });
});
