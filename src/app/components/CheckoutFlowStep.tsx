import React from 'react';

import { useCheckoutFlow } from '@src/app/hooks/useCheckoutFlow';
import type { StepId } from '@src/core/types';

export interface CheckoutFlowStepProps {
  id: StepId;
  children?: React.ReactNode;
}

export function CheckoutFlowStep({
  id,
  children,
}: CheckoutFlowStepProps): React.ReactElement | null {
  const { state } = useCheckoutFlow();
  if (state.currentStepId !== id) return null;
  return <>{children}</>;
}
