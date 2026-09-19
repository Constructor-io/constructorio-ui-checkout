// Checkout core
export { createCheckoutFlow } from './core/createCheckoutFlow';
export { createSessionStorageAdapter } from './core/storage/sessionStorageAdapter';
export type {
  AuthResult,
  CheckoutEvent,
  CheckoutEventErrorSource,
  CheckoutEventType,
  CheckoutFlowConfig,
  CheckoutFlowCore,
  FlowState,
  RouterAdapter,
  SessionDiff,
  SessionStatus,
  SessionUpdatePatch,
  SessionUpdateReason,
  Step,
  StepId,
  StorageAdapter,
} from './core/types';
export {
  CREATE_SESSION_STEP,
  FLOW_SCHEMA_VERSION,
  STRIPE_STEP,
} from './core/types';

// React adapter
export type { CioFlowStepProps } from './app/components/CioFlowStep';
export { CioFlowStep } from './app/components/CioFlowStep';
export type {
  CioFulfillmentRenderProps,
  CioFulfillmentResult,
  CioFulfillmentStatus,
  CioFulfillmentStepProps,
} from './app/components/CioFulfillmentStep';
export { CioFulfillmentStep } from './app/components/CioFulfillmentStep';
export type { CioStripePaymentStepProps } from './app/components/CioStripePaymentStep';
export { CioStripePaymentStep } from './app/components/CioStripePaymentStep';
export type { UseCheckoutFlowReturn } from './app/hooks/useCheckoutFlow';
export { useCheckoutFlow } from './app/hooks/useCheckoutFlow';
export { CheckoutFlowContext } from './app/providers/CheckoutFlowContext';
export type { CioPaymentProviderProps } from './app/providers/CioPaymentProvider';
export { CioPaymentProvider } from './app/providers/CioPaymentProvider';

// Imperative / vanilla JS
export { CheckoutFlow } from './manager/CheckoutFlow';
export {
  CheckoutRegistry,
  default as checkoutRegistry,
} from './manager/CheckoutRegistry';

// i18n helpers
export { defaultTranslations, t } from './utils/translate';

// Stripe-render types (used with CioStripePaymentStep)
export type {
  CheckoutItem,
  CheckoutLayout,
  CheckoutRedirectBehavior,
  CheckoutSessionResponse,
  CheckoutStripeOptions,
  CheckoutUiMode,
  CioCheckoutComponentOverrides,
  PayButtonRenderProps,
  Translations,
} from './types';
