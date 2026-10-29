import type { ComponentOverrideProps } from '@constructor-io/constructorio-ui-components';

import type { FiservPaymentSession } from './fiserv';
import type { StripePaymentSession } from './stripe';

export interface Translations {
  'CioCheckout.checkout.payButtonLabel'?: string;
  'CioCheckout.checkout.payButtonLoadingLabel'?: string;
  'CioCheckout.checkout.preparingLabel'?: string;
  'CioCheckout.session.errorLabel'?: string;
  'CioCheckout.session.retryLabel'?: string;
  'CioCheckout.fulfillment.pendingLabel'?: string;
  'CioCheckout.fulfillment.successLabel'?: string;
  'CioCheckout.fulfillment.failedLabel'?: string;
  'CioCheckout.fulfillment.retryLabel'?: string;
  'CioCheckout.fiserv.cardNumberLabel'?: string;
  'CioCheckout.fiserv.nameOnCardLabel'?: string;
  'CioCheckout.fiserv.expirationLabel'?: string;
  'CioCheckout.fiserv.securityCodeLabel'?: string;
  'CioCheckout.fiserv.captureFailedLabel'?: string;
  'CioCheckout.shopPay.confirmingLabel'?: string;
  'CioCheckout.shopPay.pendingLabel'?: string;
  'CioCheckout.shopPay.failedLabel'?: string;
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
  fiserv: FiservPaymentSession;
  /** Shop Pay starts its session in the popup, so the flow holds no session object. */
  'shop-pay': BasePaymentSession;
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

export interface CheckoutLoaderRenderProps {
  label: string;
}

export interface CheckoutComponentOverrides {
  payButton?: ComponentOverrideProps<PayButtonRenderProps>;
  loader?: ComponentOverrideProps<CheckoutLoaderRenderProps>;
}

export * from './fiserv';
export * from './shopPay';
export * from './stripe';
