import { Factory } from 'fishery';

import type { CheckoutItem, CheckoutSessionResponse } from '@src/types';

import {
  DEMO_CLIENT_SECRET,
  DEMO_PUBLISHABLE_KEY,
} from '../__tests__/constants';

export const checkoutSessionResponse = Factory.define<CheckoutSessionResponse>(
  () => ({
    clientSecret: DEMO_CLIENT_SECRET,
    publishableKey: DEMO_PUBLISHABLE_KEY,
  })
);

export const checkoutItem = Factory.define<CheckoutItem>(() => ({
  name: 'Test Product',
  amount: 49.99,
  quantity: 1,
}));
