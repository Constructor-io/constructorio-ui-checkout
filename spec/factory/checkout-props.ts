import { Factory } from 'fishery';

import type { BaseCartItem, StripePaymentSession } from '@src/types';

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
