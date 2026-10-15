import type { ComponentOverrideProps } from '@constructor-io/constructorio-ui-components';

import type { StripePaymentSession } from './stripe';

export interface Translations {
  'CioCheckout.checkout.title'?: string;
  'CioCheckout.checkout.cancelLabel'?: string;
  'CioCheckout.checkout.closeLabel'?: string;
  'CioCheckout.checkout.buttonLabel'?: string;
  'CioCheckout.checkout.buttonLoadingLabel'?: string;
  'CioCheckout.checkout.payButtonLabel'?: string;
  'CioCheckout.checkout.payButtonLoadingLabel'?: string;
  /** Shown while the payment step prepares the checkout session. */
  'CioCheckout.checkout.preparingLabel'?: string;
  /** Payment step: shown when the session could not be created. */
  'CioCheckout.session.errorLabel'?: string;
  /** Payment step: retry button after a session error. */
  'CioCheckout.session.retryLabel'?: string;
  /** Payment step: shown when the flow has no `onCreateSession` handler. */
  'CioCheckout.session.missingLabel'?: string;
  /** Fulfillment step: shown while `onFulfill` runs. */
  'CioCheckout.fulfillment.pendingLabel'?: string;
  /** Fulfillment step: shown on success when the result has no message. */
  'CioCheckout.fulfillment.successLabel'?: string;
  /** Fulfillment step: shown on failure when the result has no message. */
  'CioCheckout.fulfillment.failedLabel'?: string;
  /** Fulfillment step: retry button after a failure. */
  'CioCheckout.fulfillment.retryLabel'?: string;
  /** Fulfillment step: message used when `onFulfill` throws a non-Error. */
  'CioCheckout.fulfillment.errorFallbackLabel'?: string;
}

export interface BaseCartItem {
  id: string;
  name: string;
  unitAmount: number;
  quantity: number;
}

export type KeyOfType<T, R> = {
  [K in keyof T]-?: T[K] extends R ? K : never;
}[keyof T] &
  string;

export interface CartItemAccessors<TItem> {
  id: KeyOfType<TItem, string> | ((item: TItem) => string);
  quantity: KeyOfType<TItem, number> | ((item: TItem) => number);
  unitAmount: KeyOfType<TItem, number> | ((item: TItem) => number);
  name?: KeyOfType<TItem, string> | ((item: TItem) => string);
}

export interface BasePaymentSession {
  sessionId?: string;
}

export interface PaymentSessionMap {
  stripe: StripePaymentSession;
}

export type BuiltInPaymentProvider = keyof PaymentSessionMap;

export type PaymentProvider = BuiltInPaymentProvider | (string & {});

export type PaymentSessionFor<TProvider extends string> =
  TProvider extends keyof PaymentSessionMap
    ? PaymentSessionMap[TProvider]
    : BasePaymentSession;

export interface PayButtonRenderProps {
  isSubmitting: boolean;
  isDisabled: boolean;
  amount: string;
  onClick: () => void;
}

/** Props passed to a `loader` override. */
export interface CheckoutLoaderRenderProps {
  /** Translated loading text, from `CioCheckout.checkout.preparingLabel`. */
  label: string;
}

export interface CheckoutComponentOverrides {
  payButton?: ComponentOverrideProps<PayButtonRenderProps>;
  /**
   * Replaces the loading state shown while the payment step prepares the
   * session or while Stripe.js loads.
   */
  loader?: ComponentOverrideProps<CheckoutLoaderRenderProps>;
}

export * from './stripe';
