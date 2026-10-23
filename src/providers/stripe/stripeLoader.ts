import type { Stripe } from '@stripe/stripe-js';
import { loadStripe } from '@stripe/stripe-js';

import type { CheckoutStripeUiMode } from '@src/types';

const CHECKOUT_FORM_BETA = 'custom_checkout_payment_form_1';

class StripeLoader {
  private readonly stripeInstances = new Map<string, Promise<Stripe | null>>();

  getStripe(
    publishableKey: string,
    uiMode: CheckoutStripeUiMode = 'form'
  ): Promise<Stripe | null> {
    const cacheKey = `${publishableKey}:${uiMode}`;
    const existing = this.stripeInstances.get(cacheKey);
    if (existing) {
      return existing;
    }

    const options =
      uiMode === 'form' ? { betas: [CHECKOUT_FORM_BETA] } : undefined;
    const stripePromise = loadStripe(publishableKey, options);
    this.stripeInstances.set(cacheKey, stripePromise);
    return stripePromise;
  }

  clearStripe(
    publishableKey: string,
    uiMode: CheckoutStripeUiMode = 'form'
  ): void {
    this.stripeInstances.delete(`${publishableKey}:${uiMode}`);
  }

  clearAll(): void {
    this.stripeInstances.clear();
  }
}

const stripeLoader = new StripeLoader();
export default stripeLoader;
