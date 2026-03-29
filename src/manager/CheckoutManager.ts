import type { Stripe } from '@stripe/stripe-js';
import { loadStripe } from '@stripe/stripe-js';

/**
 * CheckoutManager — singleton that manages Stripe.js instances.
 *
 * Multiple libraries (PIA, search, quizzes) on the same page should share
 * a single Stripe.js instance per publishable key. The manager ensures
 * loadStripe() is only called once per key.
 */
class CheckoutManager {
  private readonly stripeInstances = new Map<string, Promise<Stripe | null>>();

  /**
   * Returns a Stripe.js instance for the given publishable key.
   * Caches the promise so loadStripe() is only called once per key.
   */
  getStripe(publishableKey: string): Promise<Stripe | null> {
    const existing = this.stripeInstances.get(publishableKey);
    if (existing) {
      return existing;
    }

    const stripePromise = loadStripe(publishableKey);
    this.stripeInstances.set(publishableKey, stripePromise);
    return stripePromise;
  }

  /**
   * Clears a cached Stripe instance (useful for key rotation).
   */
  clearStripe(publishableKey: string): void {
    this.stripeInstances.delete(publishableKey);
  }

  /**
   * Clears all cached Stripe instances.
   */
  clearAll(): void {
    this.stripeInstances.clear();
  }
}

/** Global singleton */
const checkoutManager = new CheckoutManager();
export default checkoutManager;
