import { createCheckoutFlow } from './core/createCheckoutFlow';
import { createSessionStorageAdapter } from './core/storage/sessionStorageAdapter';
import type { CheckoutFlowConfig } from './core/types';
import { CheckoutFlow } from './manager/CheckoutFlow';
import checkoutRegistry from './manager/CheckoutRegistry';
import version from './version';

import './styles.css';

// UMD-friendly namespace exposed as `window.CioCheckout` by the standalone
// build. Merchants integrating via <script src="..."> instantiate a
// CheckoutFlow (or call resume() to get a storage-backed instance that
// hydrates on page reload) and drive their own DOM. For the built-in Stripe
// UI, use the React adapter (CheckoutFlowProvider + CheckoutStripeStep).
const CioCheckout = {
  VERSION: version || '0.1.0',
  CheckoutFlow,
  createCheckoutFlow,
  createSessionStorageAdapter,
  checkoutRegistry,

  resume<TState = unknown>(
    config: CheckoutFlowConfig<TState>
  ): CheckoutFlow<TState> {
    return checkoutRegistry.resume(config);
  },

  reset(): void {
    checkoutRegistry.clear();
  },
};

export default CioCheckout;
