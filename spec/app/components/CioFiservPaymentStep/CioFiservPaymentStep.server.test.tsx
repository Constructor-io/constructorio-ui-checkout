import { renderToString } from 'react-dom/server';

import { CioFiservPaymentStep } from '@src/app/components/CioFiservPaymentStep';
import { CioCheckoutProvider } from '@src/app/providers/CioCheckoutProvider';
import { PAYMENT_STEP } from '@src/core/types';

import { fiservSession } from '../../../factory';

describe(`${CioFiservPaymentStep.name}: server`, () => {
  it('renders the loader and the field divs with no session yet', () => {
    const view = renderToString(
      <CioCheckoutProvider
        provider="fiserv"
        steps={[{ id: PAYMENT_STEP }]}
        onCreateSession={() => Promise.resolve(fiservSession.build())}
      >
        <CioFiservPaymentStep />
      </CioCheckoutProvider>
    );
    expect(view).toContain('Preparing checkout...');
    expect(view).toContain('cio-fiserv-cardNumber');
  });
});
