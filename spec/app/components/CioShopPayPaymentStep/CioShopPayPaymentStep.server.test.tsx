import { renderToString } from 'react-dom/server';

import { CioShopPayPaymentStep } from '@src/app/components/CioShopPayPaymentStep';
import { CioCheckoutProvider } from '@src/app/providers/CioCheckoutProvider';
import { PAYMENT_STEP } from '@src/core/types';

import { shopPayPaymentRequest } from '../../../factory';

describe(`${CioShopPayPaymentStep.name}: server`, () => {
  it('renders the loader before the SDK loads', () => {
    const view = renderToString(
      <CioCheckoutProvider provider="shop-pay" steps={[{ id: PAYMENT_STEP }]}>
        <CioShopPayPaymentStep
          shopId={1}
          clientId="client"
          paymentRequest={shopPayPaymentRequest.build()}
          onSessionRequest={() => Promise.reject(new Error('unused'))}
          onSubmitPayment={() => Promise.reject(new Error('unused'))}
          onCheckReceipt={() => Promise.reject(new Error('unused'))}
        />
      </CioCheckoutProvider>
    );
    expect(view).toContain('Preparing checkout...');
  });
});
