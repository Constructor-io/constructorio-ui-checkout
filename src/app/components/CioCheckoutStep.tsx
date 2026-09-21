import React from 'react';

import { useCioCheckout } from '@src/app/hooks/useCioCheckout';
import type { CheckoutStepId } from '@src/core/types';

export interface CioCheckoutStepProps {
  id: CheckoutStepId;
  children?: React.ReactNode;
}

export function CioCheckoutStep({
  id,
  children,
}: CioCheckoutStepProps): React.ReactElement | null {
  const { state } = useCioCheckout();
  if (state.currentStepId !== id) return null;
  return <>{children}</>;
}
