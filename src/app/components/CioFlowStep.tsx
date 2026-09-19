import React from 'react';

import { useCioCheckout } from '@src/app/hooks/useCioCheckout';
import type { StepId } from '@src/core/types';

export interface CioFlowStepProps {
  id: StepId;
  children?: React.ReactNode;
}

export function CioFlowStep({
  id,
  children,
}: CioFlowStepProps): React.ReactElement | null {
  const { state } = useCioCheckout();
  if (state.currentStepId !== id) return null;
  return <>{children}</>;
}
