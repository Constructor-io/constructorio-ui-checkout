import { createContext } from 'react';

import type { CheckoutFlowCore } from '@src/core/types';

export const CheckoutFlowContext =
  createContext<CheckoutFlowCore<unknown> | null>(null);
CheckoutFlowContext.displayName = 'CheckoutFlowContext';
