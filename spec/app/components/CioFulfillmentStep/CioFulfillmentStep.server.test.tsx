import { renderToString } from 'react-dom/server';

import { CioFlowStep } from '@src/app/components/CioFlowStep';
import {
  type CioFulfillmentResult,
  CioFulfillmentStep,
} from '@src/app/components/CioFulfillmentStep';
import { CioPaymentProvider } from '@src/app/providers/CioPaymentProvider';

const stubSession = () =>
  Promise.resolve({
    clientSecret: 'cs_test_a_secret_x',
    publishableKey: 'pk_test',
  });

const onFulfill = (): Promise<CioFulfillmentResult> =>
  Promise.resolve({ success: true });

describe(`${CioFulfillmentStep.name}: server`, () => {
  it('is safe to render inside a Provider server-side', () => {
    expect(() =>
      renderToString(
        <CioPaymentProvider
          steps={[{ id: 'fulfill' }]}
          onCreateSession={stubSession}
        >
          <CioFlowStep id="fulfill">
            <CioFulfillmentStep onFulfill={onFulfill} />
          </CioFlowStep>
        </CioPaymentProvider>
      )
    ).not.toThrow();
  });

  it('renders nothing before the flow enters the fulfillment step', () => {
    const view = renderToString(
      <CioPaymentProvider
        steps={[{ id: 'fulfill' }]}
        onCreateSession={stubSession}
      >
        <CioFlowStep id="fulfill">
          <CioFulfillmentStep onFulfill={onFulfill} />
        </CioFlowStep>
      </CioPaymentProvider>
    );
    expect(view).not.toContain('cio-checkout-fulfillment');
  });
});
