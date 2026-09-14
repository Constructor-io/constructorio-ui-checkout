import type { Translations } from '@src/types';

export const defaultTranslations: Required<Translations> = {
  'CioCheckout.checkout.title': 'Checkout',
  'CioCheckout.checkout.cancelLabel': 'Cancel',
  'CioCheckout.checkout.closeLabel': 'Close checkout',
  'CioCheckout.checkout.buttonLabel': 'Checkout',
  'CioCheckout.checkout.buttonLoadingLabel': 'Loading...',
  'CioCheckout.checkout.payButtonLabel': 'Pay',
  'CioCheckout.checkout.payButtonLoadingLabel': 'Processing...',
  'CioCheckout.fulfillment.pending': 'Verifying your order...',
  'CioCheckout.fulfillment.success': 'Order Confirmed',
  'CioCheckout.fulfillment.failure': 'Verification Failed',
  'CioCheckout.fulfillment.failureHint':
    'Your payment was processed. Please contact support if the issue persists.',
  'CioCheckout.fulfillment.dismissLabel': 'Done',
  'CioCheckout.fulfillment.retryLabel': 'Retry',
};

export function t(
  translations: Translations | undefined,
  key: keyof Required<Translations>
): string {
  return translations?.[key] ?? defaultTranslations[key];
}
