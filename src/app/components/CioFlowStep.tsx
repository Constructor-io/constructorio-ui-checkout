import React from 'react';

import { useCioPayment } from '@src/app/hooks/useCioPayment';
import type { StepId } from '@src/core/types';

export interface CioFlowStepProps {
  id: StepId;
  children?: React.ReactNode;
}

export function CioFlowStep({
  id,
  children,
}: CioFlowStepProps): React.ReactElement | null {
  const { state } = useCioPayment();
  if (state.currentStepId !== id) return null;
  return <>{children}</>;
}
