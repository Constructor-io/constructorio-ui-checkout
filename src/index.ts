// Components
export { default as CioCheckout } from './app';

// Registry (non-React singleton for standalone/bundled)
export { default as checkoutRegistry } from './registry/CheckoutRegistry';

// Hooks
export { default as useCheckoutSession } from './app/hooks/useCheckoutSession';

// Types
export type { UseCheckoutSessionReturn } from './app/hooks/useCheckoutSession';
export type {
  CheckoutCompleteEvent,
  CheckoutConfig,
  CheckoutFulfillmentEvent,
  CheckoutItem,
  CheckoutSession,
  CheckoutSessionResponse,
  CioCheckoutCallbacks,
  CioCheckoutHandle,
  CioCheckoutProps,
  FulfillmentResult,
  FulfillmentStatus,
} from './types';
