import { renderToString } from 'react-dom/server';

import { CheckoutFlowStep } from '@src/app/components/CheckoutFlowStep';
import { CheckoutStripeStep } from '@src/app/components/CheckoutStripeStep';
import { CheckoutFlowProvider } from '@src/app/providers/CheckoutFlowProvider';
import { STRIPE_STEP } from '@src/core/types';

const stubSession = () =>
  Promise.resolve({
    clientSecret: 'cs_test_a_secret_x',
    publishableKey: 'pk_test',
  });

describe(`${CheckoutStripeStep.name}: server`, () => {
  it('is safe to render inside a Provider server-side', () => {
    expect(() =>
      renderToString(
        <CheckoutFlowProvider
          steps={[{ id: STRIPE_STEP }]}
          onCreateSession={stubSession}
        >
          <CheckoutFlowStep id={STRIPE_STEP}>
            <CheckoutStripeStep />
          </CheckoutFlowStep>
        </CheckoutFlowProvider>
      )
    ).not.toThrow();
  });

  it('renders nothing before the flow enters the stripe step', () => {
    const view = renderToString(
      <CheckoutFlowProvider
        steps={[{ id: STRIPE_STEP }]}
        onCreateSession={stubSession}
      >
        <CheckoutFlowStep id={STRIPE_STEP}>
          <CheckoutStripeStep />
        </CheckoutFlowStep>
      </CheckoutFlowProvider>
    );
    expect(view).not.toContain('stripe-provider');
  });
});
