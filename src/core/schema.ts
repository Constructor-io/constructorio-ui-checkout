import type { FlowState } from './types';
import { FLOW_SCHEMA_VERSION } from './types';

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const isStringOrNull = (v: unknown): v is string | null =>
  v === null || typeof v === 'string';

const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((item) => typeof item === 'string');

const VALID_SESSION_STATUSES = new Set([
  'idle',
  'creating',
  'active',
  'expired',
  'error',
]);

// Rejects untrusted input on any structural mismatch — never mutates or
// coerces — to prevent prototype pollution from a backend storage adapter.
export function validateFlowState(input: unknown): FlowState | null {
  if (!isPlainObject(input)) return null;
  if (input.schemaVersion !== FLOW_SCHEMA_VERSION) return null;
  if (!isStringOrNull(input.currentStepId)) return null;
  if (!isStringArray(input.completedStepIds)) return null;
  if (!Array.isArray(input.cartSnapshot)) return null;
  if (!isStringOrNull(input.sessionId)) return null;
  if (
    typeof input.sessionStatus !== 'string' ||
    !VALID_SESSION_STATUSES.has(input.sessionStatus)
  ) {
    return null;
  }
  if (!isPlainObject(input.metadata)) return null;

  for (const item of input.cartSnapshot) {
    if (!isPlainObject(item)) return null;
    if (typeof item.name !== 'string') return null;
  }

  // Every field has been narrowed by the checks above; TS's structural type
  // system can't propagate that across a Record<string, unknown> → FlowState
  // cast, so we bridge through unknown. Safety comes from the runtime checks.
  return input as unknown as FlowState;
}
