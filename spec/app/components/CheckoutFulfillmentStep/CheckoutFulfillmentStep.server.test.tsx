import { renderToString } from 'react-dom/server';

import { CheckoutFlowStep } from '@src/app/components/CheckoutFlowStep';
import {
  CheckoutFulfillmentStep,
  type FulfillmentResult,
} from '@src/app/components/CheckoutFulfillmentStep';
import { CheckoutFlowProvider } from '@src/app/providers/CheckoutFlowProvider';

const stubSession = () =>
  Promise.resolve({
    clientSecret: 'cs_test_a_secret_x',
    publishableKey: 'pk_test',
  });

const onFulfill = (): Promise<FulfillmentResult> =>
  Promise.resolve({ success: true });

describe(`${CheckoutFulfillmentStep.name}: server`, () => {
  it('is safe to render inside a Provider server-side', () => {
    expect(() =>
      renderToString(
        <CheckoutFlowProvider
          steps={[{ id: 'fulfill' }]}
          onCreateSession={stubSession}
        >
          <CheckoutFlowStep id="fulfill">
            <CheckoutFulfillmentStep onFulfill={onFulfill} />
          </CheckoutFlowStep>
        </CheckoutFlowProvider>
      )
    ).not.toThrow();
  });

  it('renders nothing before the flow enters the fulfillment step', () => {
    const view = renderToString(
      <CheckoutFlowProvider
        steps={[{ id: 'fulfill' }]}
        onCreateSession={stubSession}
      >
        <CheckoutFlowStep id="fulfill">
          <CheckoutFulfillmentStep onFulfill={onFulfill} />
        </CheckoutFlowStep>
      </CheckoutFlowProvider>
    );
    expect(view).not.toContain('cio-checkout-fulfillment');
  });
});
