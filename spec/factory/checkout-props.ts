import { Factory } from 'fishery';

import type {
  BaseCartItem,
  FiservPaymentSession,
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
