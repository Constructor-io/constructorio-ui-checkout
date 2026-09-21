import { createContext } from 'react';

import type { CheckoutFlowCore } from '@src/core/types';

export const CioPaymentContext =
  createContext<CheckoutFlowCore<unknown> | null>(null);
CioPaymentContext.displayName = 'CioPaymentContext';
