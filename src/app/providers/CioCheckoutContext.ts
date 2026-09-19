import { createContext } from 'react';

import type { CheckoutFlowCoreBase } from '@src/core/types';

export const CioCheckoutContext = createContext<CheckoutFlowCoreBase<
  string,
  unknown
> | null>(null);
CioCheckoutContext.displayName = 'CioCheckoutContext';
