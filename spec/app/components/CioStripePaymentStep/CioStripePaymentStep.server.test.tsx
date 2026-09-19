import { renderToString } from 'react-dom/server';

import { CioFlowStep } from '@src/app/components/CioFlowStep';
import { CioStripePaymentStep } from '@src/app/components/CioStripePaymentStep';
import { CioPaymentProvider } from '@src/app/providers/CioPaymentProvider';
import { STRIPE_STEP } from '@src/core/types';

const stubSession = () =>
  Promise.resolve({
    clientSecret: 'cs_test_a_secret_x',
    publishableKey: 'pk_test',
  });

describe(`${CioStripePaymentStep.name}: server`, () => {
  it('is safe to render inside a Provider server-side', () => {
    expect(() =>
      renderToString(
        <CioPaymentProvider
          steps={[{ id: STRIPE_STEP }]}
          onCreateSession={stubSession}
        >
          <CioFlowStep id={STRIPE_STEP}>
            <CioStripePaymentStep />
          </CioFlowStep>
        </CioPaymentProvider>
      )
    ).not.toThrow();
  });

  it('renders nothing before the flow enters the stripe step', () => {
    const view = renderToString(
      <CioPaymentProvider
        steps={[{ id: STRIPE_STEP }]}
        onCreateSession={stubSession}
      >
        <CioFlowStep id={STRIPE_STEP}>
          <CioStripePaymentStep />
        </CioFlowStep>
      </CioPaymentProvider>
    );
    expect(view).not.toContain('stripe-provider');
  });
});
