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
  PAYMENT_STEP,
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
export type { UseCioCheckoutReturn } from './app/hooks/useCioCheckout';
export { useCioCheckout } from './app/hooks/useCioCheckout';
export { CioCheckoutContext } from './app/providers/CioCheckoutContext';
export type { CioCheckoutProviderProps } from './app/providers/CioCheckoutProvider';
export { CioCheckoutProvider } from './app/providers/CioCheckoutProvider';

// Registry (multi-library setups)
export {
  CioCheckoutRegistry,
  default as cioCheckoutRegistry,
} from './manager/CioCheckoutRegistry';

// i18n helpers
export { defaultTranslations, t } from './utils/translate';

// Payment session types (returned by onCreateSession)
export type {
  BasePaymentSession,
  BuiltInPaymentProvider,
  PaymentProvider,
  PaymentSessionFor,
  PaymentSessionMap,
  StripePaymentSession,
} from './types';

// Render / SDK types
export type {
  CheckoutComponentOverrides,
  CheckoutItem,
  CheckoutLayout,
  CheckoutRedirectBehavior,
  CheckoutStripeOptions,
  CheckoutUiMode,
  PayButtonRenderProps,
  Translations,
} from './types';
