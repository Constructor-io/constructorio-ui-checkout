import { Factory } from 'fishery';

import type {
  BaseCartItem,
  FiservPaymentSession,
  ShopPayPaymentRequest,
  ShopPaySessionResponse,
  StripePaymentSession,
} from '@src/types';

import {
  DEMO_CLIENT_SECRET,
  DEMO_PUBLISHABLE_KEY,
} from '../__tests__/constants';

export const checkoutSessionResponse = Factory.define<StripePaymentSession>(
  () => ({
    clientSecret: DEMO_CLIENT_SECRET,
    publishableKey: DEMO_PUBLISHABLE_KEY,
  })
);

let itemCounter = 0;
export const cartItem = Factory.define<BaseCartItem>(() => {
  itemCounter += 1;
  return {
    id: `item_${itemCounter}`,
    name: 'Test Product',
    unitAmount: 49.99,
    quantity: 1,
  };
});

export const fiservSession = Factory.define<FiservPaymentSession>(() => ({
  sessionId: 'ps_test',
  accessToken: 'at_test',
  publicKey: 'pk_test',
  keyId: 'kid_test',
  apiKey: 'api_test',
  merchantId: 'm_test',
  terminalId: 't_test',
  environment: 'cert',
}));

const usd = (amount: number) => ({ amount, currencyCode: 'USD' });

export const shopPayPaymentRequest = Factory.define<ShopPayPaymentRequest>(
  () => ({
    lineItems: [
      {
        label: 'Shirt',
        quantity: 2,
        originalItemPrice: usd(25),
        finalItemPrice: usd(25),
        originalLinePrice: usd(50),
        finalLinePrice: usd(50),
        requiresShipping: true,
      },
    ],
    shippingLines: [],
    deliveryMethods: [],
    totalShippingPrice: { finalTotal: usd(0) },
    discountCodes: [],
    subtotal: usd(50),
    total: usd(50),
    locale: 'en',
    presentmentCurrency: 'USD',
  })
);

export const shopPaySession = Factory.define<ShopPaySessionResponse>(() => ({
  token: 'spt_test',
  checkoutUrl: 'https://shop.app/checkout/test',
  sourceIdentifier: 'src_test',
}));
