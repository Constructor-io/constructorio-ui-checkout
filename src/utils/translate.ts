import type { Translations } from '@src/types';

export const defaultTranslations: Required<Translations> = {
  'CioCheckout.checkout.payButtonLabel': 'Pay',
  'CioCheckout.checkout.payButtonLoadingLabel': 'Processing...',
  'CioCheckout.checkout.preparingLabel': 'Preparing checkout...',
  'CioCheckout.session.errorLabel':
    'Failed to prepare checkout. Please try again.',
  'CioCheckout.session.retryLabel': 'Retry',
  'CioCheckout.session.missingLabel':
    'This payment step needs an onCreateSession handler.',
  'CioCheckout.fulfillment.pendingLabel': 'Verifying your order...',
  'CioCheckout.fulfillment.successLabel': 'Order confirmed',
  'CioCheckout.fulfillment.failedLabel': 'Verification failed',
  'CioCheckout.fulfillment.retryLabel': 'Retry',
  'CioCheckout.fulfillment.errorFallbackLabel': 'Fulfillment failed',
};

export function t(
  translations: Translations | undefined,
  key: keyof Required<Translations>
): string {
  return translations?.[key] ?? defaultTranslations[key];
}
