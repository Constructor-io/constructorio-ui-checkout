import type { ComponentOverrideProps } from '@constructor-io/constructorio-ui-components';
import type {
  Appearance,
  CssFontSource,
  CustomFontSource,
  SavedPaymentMethodOption,
  StripeCheckoutContact,
  StripeCheckoutElementsSdkOptions,
} from '@stripe/stripe-js';

export interface Translations {
  'CioCheckout.checkout.title'?: string;
  'CioCheckout.checkout.cancelLabel'?: string;
  'CioCheckout.checkout.closeLabel'?: string;
  'CioCheckout.checkout.buttonLabel'?: string;
  'CioCheckout.checkout.buttonLoadingLabel'?: string;
  'CioCheckout.checkout.payButtonLabel'?: string;
  'CioCheckout.checkout.payButtonLoadingLabel'?: string;
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

export interface StripePaymentSession extends BasePaymentSession {
  clientSecret: string;
  publishableKey: string;
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

export type CheckoutUiMode = 'elements' | 'form';

export type CheckoutRedirectBehavior = 'always' | 'if_required';

export type CheckoutLayout = 'expanded' | 'compact';

export interface CheckoutStripeOptions {
  appearance?: Omit<Appearance, 'rules'>;
  loader?: 'auto' | 'always' | 'never';
  fonts?: Array<CssFontSource | CustomFontSource>;
  layout?: CheckoutLayout;
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

export interface PayButtonRenderProps {
  isSubmitting: boolean;
  isDisabled: boolean;
  amount: string;
  onClick: () => void;
}

export interface CheckoutComponentOverrides {
  payButton?: ComponentOverrideProps<PayButtonRenderProps>;
}
