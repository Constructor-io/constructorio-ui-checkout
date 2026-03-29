import type { Translations } from '@src/types';

export const defaultTranslations: Required<Translations> = {
  'CioCheckout.checkout.title': 'Checkout',
  'CioCheckout.checkout.cancelLabel': 'Cancel',
  'CioCheckout.checkout.closeLabel': 'Close checkout',
  'CioCheckout.checkout.buttonLabel': 'Checkout',
  'CioCheckout.checkout.buttonLoadingLabel': 'Loading...',
  'CioCheckout.checkout.fulfillmentPending': 'Verifying your order...',
  'CioCheckout.checkout.fulfillmentSuccess': 'Order Confirmed',
  'CioCheckout.checkout.fulfillmentFailure': 'Verification Failed',
  'CioCheckout.checkout.fulfillmentFailureHint':
    'Your payment was processed. Please contact support if the issue persists.',
  'CioCheckout.checkout.fulfillmentDismissLabel': 'Done',
  'CioCheckout.checkout.fulfillmentRetryLabel': 'Retry',
};

export type TranslationKey = keyof Required<Translations>;

export function t(
  translations: Translations | undefined,
  key: TranslationKey
): string {
  return translations?.[key] ?? defaultTranslations[key];
}
