import { createContext } from 'react';

import type { CheckoutFlowCore } from '@src/core/types';

export const CioCheckoutContext = createContext<CheckoutFlowCore<
  string,
  unknown
> | null>(null);
CioCheckoutContext.displayName = 'CioCheckoutContext';
