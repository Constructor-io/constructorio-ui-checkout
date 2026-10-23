import type {
  Appearance,
  CssFontSource,
  CustomFontSource,
  SavedPaymentMethodOption,
  StripeCheckoutContact,
  StripeCheckoutElementsSdkOptions,
} from '@stripe/stripe-js';

import type { BasePaymentSession } from './index';

export interface StripePaymentSession extends BasePaymentSession {
  clientSecret: string;
  publishableKey: string;
}

export type CheckoutStripeUiMode = 'elements' | 'form';

export type CheckoutStripeRedirectBehavior = 'always' | 'if_required';

export type CheckoutStripeLayout = 'expanded' | 'compact';

export interface CheckoutStripeOptions {
  appearance?: Omit<Appearance, 'rules'>;
  loader?: 'auto' | 'always' | 'never';
  fonts?: Array<CssFontSource | CustomFontSource>;
  layout?: CheckoutStripeLayout;
  defaultValues?: {
    billingAddress?: StripeCheckoutContact;
    shippingAddress?: StripeCheckoutContact;
    email?: string;
    phoneNumber?: string;
  };
  savedPaymentMethod?: SavedPaymentMethodOption;
  adaptivePricing?: StripeCheckoutElementsSdkOptions['adaptivePricing'];
  syncAddressCheckbox?: NonNullable<
    StripeCheckoutElementsSdkOptions['elementsOptions']
  >['syncAddressCheckbox'];
}
