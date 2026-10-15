import { createCheckoutFlow } from './core/createCheckoutFlow';
import { createSessionStorageAdapter } from './core/storage/sessionStorageAdapter';
import type { CheckoutFlowConfig, CheckoutFlowCore } from './core/types';
import cioCheckoutRegistry from './manager/CioCheckoutRegistry';
import type { BaseCartItem, BuiltInPaymentProvider } from './types';
import version from './version';

import './styles.css';

const CioCheckout = {
  VERSION: version || '0.1.0',
  createCheckoutFlow,
  createSessionStorageAdapter,
  cioCheckoutRegistry,

  resume<
    TProvider extends string = BuiltInPaymentProvider,
    TState = unknown,
    TItem = BaseCartItem,
  >(
    config: CheckoutFlowConfig<TProvider, TState, TItem>
  ): CheckoutFlowCore<TProvider, TState, TItem> {
    return cioCheckoutRegistry.resume<TProvider, TState, TItem>(config);
  },

  reset(): void {
    cioCheckoutRegistry.clear();
  },
};

export default CioCheckout;
