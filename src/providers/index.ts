import type { BasePaymentSession } from '@src/types';

import * as fiserv from './fiserv/session';
import * as stripe from './stripe/session';

export interface ProviderAdapter {
  validateSession: (r: unknown) => boolean;
  getSessionId: (session: BasePaymentSession) => string | null;
}

export const providerAdapters: Record<string, ProviderAdapter> = {
  stripe: {
    validateSession: stripe.validateSession,
    getSessionId: stripe.getSessionId,
  },
  fiserv: {
    validateSession: fiserv.validateSession,
    getSessionId: fiserv.getSessionId,
  },
};

export function getProviderAdapter(provider: string): ProviderAdapter | null {
  return Object.prototype.hasOwnProperty.call(providerAdapters, provider)
    ? providerAdapters[provider]
    : null;
}
