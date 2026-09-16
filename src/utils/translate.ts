import type { Translations } from '@src/types';

export const defaultTranslations: Required<Translations> = {
  'CioCheckout.checkout.title': 'Checkout',
  'CioCheckout.checkout.cancelLabel': 'Cancel',
  'CioCheckout.checkout.closeLabel': 'Close checkout',
  'CioCheckout.checkout.buttonLabel': 'Checkout',
  'CioCheckout.checkout.buttonLoadingLabel': 'Loading...',
  'CioCheckout.checkout.payButtonLabel': 'Pay',
  'CioCheckout.checkout.payButtonLoadingLabel': 'Processing...',
};

export function t(
  translations: Translations | undefined,
  key: keyof Required<Translations>
): string {
  return translations?.[key] ?? defaultTranslations[key];
}
