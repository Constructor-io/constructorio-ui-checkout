import { createCheckoutFlow } from './core/createCheckoutFlow';
import { createSessionStorageAdapter } from './core/storage/sessionStorageAdapter';
import type { CheckoutFlowConfig } from './core/types';
import { CioCheckoutFlow } from './manager/CioCheckoutFlow';
import cioCheckoutRegistry from './manager/CioCheckoutRegistry';
import version from './version';

import './styles.css';

// UMD-friendly namespace exposed as `window.CioCheckout` by the standalone
// build. Merchants integrating via <script src="..."> instantiate a
// CioCheckoutFlow (or call resume() to get a storage-backed instance that
// hydrates on page reload) and drive their own DOM. For the built-in Stripe
// UI, use the React adapter (CioPaymentProvider + CioStripePaymentStep).
const CioCheckout = {
  VERSION: version || '0.1.0',
  CioCheckoutFlow,
  createCheckoutFlow,
  createSessionStorageAdapter,
  cioCheckoutRegistry,

  resume<TState = unknown>(
    config: CheckoutFlowConfig<TState>
  ): CioCheckoutFlow<TState> {
    return cioCheckoutRegistry.resume(config);
  },

  reset(): void {
    cioCheckoutRegistry.clear();
  },
};

export default CioCheckout;
