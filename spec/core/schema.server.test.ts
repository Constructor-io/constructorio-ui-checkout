import { validateFlowState } from '@src/core/schema';
import { FLOW_SCHEMA_VERSION } from '@src/core/types';

describe(`${validateFlowState.name}: server`, () => {
  it('accepts a valid state server-side', () => {
    const result = validateFlowState({
      currentStepId: 'a',
      completedStepIds: [],
      cartSnapshot: [],
      currency: null,
      sessionId: null,
      sessionStatus: 'idle',
      metadata: {},
      schemaVersion: FLOW_SCHEMA_VERSION,
    });
    expect(result).not.toBeNull();
  });

  it('rejects malformed input server-side', () => {
    expect(validateFlowState(null)).toBeNull();
    expect(validateFlowState('nope')).toBeNull();
    expect(validateFlowState({ schemaVersion: 99 })).toBeNull();
  });
});
