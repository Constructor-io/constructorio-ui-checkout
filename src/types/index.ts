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

export interface CheckoutItem {
  name: string;
  amount: number;
  currencySign?: string;
  quantity?: number;
  priceId?: string;
  imageUrl?: string;
}

export interface CheckoutSessionResponse {
  clientSecret: string;
  publishableKey: string;
}

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

export interface CioCheckoutComponentOverrides {
  payButton?: ComponentOverrideProps<PayButtonRenderProps>;
}
