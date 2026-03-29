import type { CheckoutSession } from '@src/types';

/**
 * CheckoutRegistry — non-React singleton for sharing checkout session
 * across multiple CIO libraries on the same page.
 *
 * Use this for the bundled/standalone use case where there's no React tree
 * to provide context. The merchant registers their session creator once:
 *
 *   CioCheckout.register(() => fetch('/api/checkout').then(r => r.json()));
 *
 * Any CIO library on the page can then look up the session via
 * CheckoutRegistry.getSession().
 *
 * For React apps, you can also pass `session` directly as a prop to CioCheckout.
 */
class CheckoutRegistry {
  private session: CheckoutSession | null = null;

  /**
   * Register a checkout session globally.
   * Overwrites any previously registered session.
   */
  register(session: CheckoutSession): void {
    this.session = session;
  }

  /**
   * Get the registered session, or null if none has been registered.
   */
  getSession(): CheckoutSession | null {
    return this.session;
  }

  /**
   * Check whether a session has been registered.
   */
  isRegistered(): boolean {
    return this.session !== null;
  }

  /**
   * Clear the registered session.
   */
  clear(): void {
    this.session = null;
  }
}

/** Global singleton */
const checkoutRegistry = new CheckoutRegistry();
export default checkoutRegistry;
