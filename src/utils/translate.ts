import type { Translations } from '@src/types';

export const defaultTranslations: Required<Translations> = {
  'CioCheckout.checkout.payButtonLabel': 'Pay',
  'CioCheckout.checkout.payButtonLoadingLabel': 'Processing...',
  'CioCheckout.checkout.preparingLabel': 'Preparing checkout...',
  'CioCheckout.session.errorLabel':
    'Failed to prepare checkout. Please try again.',
  'CioCheckout.session.retryLabel': 'Retry',
  'CioCheckout.fulfillment.pendingLabel': 'Verifying your order...',
  'CioCheckout.fulfillment.successLabel': 'Order confirmed',
  'CioCheckout.fulfillment.failedLabel': 'Verification failed',
  'CioCheckout.fulfillment.retryLabel': 'Retry',
  'CioCheckout.fiserv.cardNumberLabel': 'Card number',
  'CioCheckout.fiserv.nameOnCardLabel': 'Name on card',
  'CioCheckout.fiserv.expirationLabel': 'Expiration',
  'CioCheckout.fiserv.securityCodeLabel': 'Security code',
  'CioCheckout.fiserv.captureFailedLabel':
    'Those card details could not be accepted. Check them and try again.',
};

export function t(
  translations: Translations | undefined,
  key: keyof Required<Translations>
): string {
  return translations?.[key] ?? defaultTranslations[key];
}
