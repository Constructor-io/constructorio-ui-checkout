import type { CheckoutSessionResponse } from '@src/types';

import type { FlowState, Step, StepId } from '../types';
import { FLOW_SCHEMA_VERSION } from '../types';

export function makeInitialState(): FlowState {
  return {
    currentStepId: null,
    completedStepIds: [],
    cartSnapshot: [],
    sessionId: null,
    sessionStatus: 'idle',
    metadata: {},
    schemaVersion: FLOW_SCHEMA_VERSION,
  };
}

export function findStepIndex(steps: Step[], id: StepId | null): number {
  if (id === null) return -1;
  return steps.findIndex((s) => s.id === id);
}

export function toError(reason: unknown): Error {
  if (reason instanceof Error) return reason;
  if (typeof reason === 'string') return new Error(reason);
  return new Error('Unknown error');
}

export function isValidSessionResponse(
  r: unknown
): r is CheckoutSessionResponse {
  return (
    r !== null &&
    typeof r === 'object' &&
    typeof (r as CheckoutSessionResponse).clientSecret === 'string' &&
    typeof (r as CheckoutSessionResponse).publishableKey === 'string'
  );
}
