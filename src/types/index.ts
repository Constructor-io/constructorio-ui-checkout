import type { ComponentOverrideProps } from '@constructor-io/constructorio-ui-components';
import type {
  Appearance,
  CssFontSource,
  CustomFontSource,
  SavedPaymentMethodOption,
  StripeCheckoutContact,
  StripeCheckoutElementsSdkOptions,
} from '@stripe/stripe-js';

/** i18n keys for customizing text displayed in the checkout UI. */
export interface Translations {
  'CioCheckout.checkout.title'?: string;
  'CioCheckout.checkout.cancelLabel'?: string;
  'CioCheckout.checkout.closeLabel'?: string;
  'CioCheckout.checkout.buttonLabel'?: string;
  'CioCheckout.checkout.buttonLoadingLabel'?: string;
  'CioCheckout.checkout.payButtonLabel'?: string;
  'CioCheckout.checkout.payButtonLoadingLabel'?: string;
  'CioCheckout.fulfillment.pending'?: string;
  'CioCheckout.fulfillment.success'?: string;
  'CioCheckout.fulfillment.failure'?: string;
  'CioCheckout.fulfillment.failureHint'?: string;
  'CioCheckout.fulfillment.dismissLabel'?: string;
  'CioCheckout.fulfillment.retryLabel'?: string;
}

/** A line item displayed in the checkout trigger and passed to lifecycle callbacks. */
export interface CheckoutItem {
  /** Display name of the product */
  name: string;
  /** Unit price as a float (e.g. 49.99) */
  amount: number;
  /** Currency symbol shown alongside the price (e.g. '$', '€') */
  currencySign?: string;
  /** Number of units (defaults to 1) */
  quantity?: number;
  /** Stripe Price ID — when set, takes precedence over `amount` and `name` */
  priceId?: string;
  /** Product image URL shown in the trigger */
  imageUrl?: string;
}

/** Credentials returned by the server to initialize the Stripe checkout session. */
export interface CheckoutSessionResponse {
  clientSecret: string;
  publishableKey: string;
}

/**
 * A session object or an async function that fetches one.
 * The function form is called lazily when the user opens the checkout.
 */
export type CheckoutSession =
  | CheckoutSessionResponse
  | (() => Promise<CheckoutSessionResponse>);

/**
 * Which Stripe surface to render:
 * - `'elements'` — GA Custom Checkout with PaymentElement (server: `ui_mode: 'elements'`)
 * - `'form'` — Beta Checkout Form (server: `ui_mode: 'form'`, requires beta access)
 */
export type CheckoutUiMode = 'elements' | 'form';

/** Stripe provider styling and behavior options passed through to the Stripe SDK. */
export interface CheckoutStripeOptions {
  /** Stripe Appearance API theme and variables for styling the payment form */
  appearance?: Omit<Appearance, 'rules'>;
  /** Controls the skeleton loading UI shown while elements mount */
  loader?: 'auto' | 'always' | 'never';
  /** Custom web fonts for the Stripe payment form */
  fonts?: Array<CssFontSource | CustomFontSource>;
  /** Payment method layout: 'expanded' shows all methods open, 'compact' uses an accordion (form mode only) */
  layout?: 'expanded' | 'compact';
  /** Pre-fill customer details in the payment form */
  defaultValues?: {
    billingAddress?: StripeCheckoutContact;
    shippingAddress?: StripeCheckoutContact;
    email?: string;
    phoneNumber?: string;
  };
  /** Controls saved payment method save/redisplay behavior */
  savedPaymentMethod?: SavedPaymentMethodOption;
  /** Show prices in the customer's local currency (elements mode only) */
  adaptivePricing?: StripeCheckoutElementsSdkOptions['adaptivePricing'];
  /** Sync billing/shipping address checkbox behavior (elements mode only) */
  syncAddressCheckbox?: NonNullable<
    StripeCheckoutElementsSdkOptions['elementsOptions']
  >['syncAddressCheckbox'];
}

/** Core checkout configuration — items, session, Stripe surface mode, and provider options. */
export interface CheckoutConfig extends CheckoutStripeOptions {
  /** Products the customer is purchasing */
  items?:
    | CheckoutItem
    | CheckoutItem[]
    | (() => Promise<CheckoutItem | CheckoutItem[]>);
  /** Stripe session credentials or a function that fetches them */
  session?: CheckoutSession;
  /** Which Stripe checkout surface to render */
  uiMode?: CheckoutUiMode;
}

/** Payload delivered to `onComplete` and `onFulfill` after successful payment. */
export interface CheckoutCompleteEvent {
  /** Stripe Checkout Session ID for server-side retrieval */
  sessionId: string;
  /** Resolved items array (undefined if none were provided) */
  items: CheckoutItem[] | undefined;
}

export type FulfillmentStatus = 'idle' | 'pending' | 'fulfilled' | 'failed';

/** Result returned from the consumer's fulfillment verification function. */
export interface FulfillmentResult {
  /** Whether fulfillment succeeded */
  success: boolean;
  /** Message shown to the user (e.g. "Order #1234 confirmed") */
  message?: string;
}

/** Payload delivered to `onFulfillComplete` after verification finishes. */
export interface CheckoutFulfillmentEvent extends CheckoutCompleteEvent {
  result: FulfillmentResult;
}

/** Props received by a custom `payButton` component override. */
export interface PayButtonRenderProps {
  /** Whether the payment is currently being processed */
  isSubmitting: boolean;
  /** Whether the button should be non-interactive */
  isDisabled: boolean;
  /** Formatted amount string (e.g. "$49.99") */
  amount: string;
  /** Call this to trigger payment confirmation */
  onClick: () => void;
}

/** Props received by a custom `checkoutStatus` component override. */
export interface CheckoutStatusRenderProps {
  fulfillmentStatus: FulfillmentStatus;
  fulfillmentResult: FulfillmentResult | null;
  onRetry: () => void;
  onDismiss: () => void;
  translations?: Translations;
}

export interface CioCheckoutComponentOverrides {
  /** Replace the default pay/submit button in elements mode */
  payButton?: ComponentOverrideProps<PayButtonRenderProps>;
  /** Replace the default post-payment status UI */
  checkoutStatus?: ComponentOverrideProps<CheckoutStatusRenderProps>;
}

/** Lifecycle callbacks for the checkout flow. */
export interface CioCheckoutCallbacks {
  /** Fires when payment completes successfully */
  onComplete?: (event: CheckoutCompleteEvent) => void;
  /** Fires when the user dismisses or closes the checkout */
  onClose?: () => void;
  /** Fires on session creation or payment errors */
  onError?: (error: Error) => void;
  /** Async verification function called after payment — return success/failure */
  onFulfill?: (event: CheckoutCompleteEvent) => Promise<FulfillmentResult>;
  /** Fires after `onFulfill` resolves (success or failure) */
  onFulfillComplete?: (event: CheckoutFulfillmentEvent) => void;
  /** Fires when the Stripe session expires while the form is open */
  onSessionExpired?: () => void;
}

/** Imperative methods exposed via `ref` on CioCheckout. */
export interface CioCheckoutHandle {
  /** Open the checkout programmatically (fetches session if needed) */
  open: () => void;
  /** Close the checkout without completing payment */
  close: () => void;
  /** Reset to initial state (closes form, clears fulfillment) */
  reset: () => void;
}

/** Props for the `<CioCheckout>` component. */
export interface CioCheckoutProps<
  TState = Record<string, unknown>,
> extends CheckoutConfig {
  /** Lifecycle callbacks */
  callbacks?: CioCheckoutCallbacks;
  /** Custom trigger element (replaces the default button) */
  trigger?: React.ReactNode;
  /** Label for the default trigger button */
  triggerLabel?: string;
  /** Controls trigger visibility based on external state */
  triggerWhen?: (state: TState) => boolean;
  /** State object passed to `triggerWhen` */
  triggerState?: TState;
  /** `'modal'` (default) renders in a dialog; `'inline'` renders in place */
  displayMode?: 'modal' | 'inline';
  /** Override default UI text */
  translations?: Translations;
  /** Replace built-in sub-components with custom implementations */
  componentOverrides?: CioCheckoutComponentOverrides;
}
