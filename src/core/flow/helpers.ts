import type { CheckoutItem, CheckoutSessionResponse } from '@src/types';

import type { FlowState, SessionDiff, Step, StepId } from '../types';
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

export function extractSessionId(
  clientSecret: string | null | undefined
): string | null {
  if (typeof clientSecret !== 'string' || clientSecret.length === 0)
    return null;
  const idx = clientSecret.indexOf('_secret_');
  if (idx <= 0) return null;
  return clientSecret.slice(0, idx);
}

function keyOf(item: CheckoutItem): string {
  return item.priceId ?? item.name;
}

export function computeCartDiff(
  before: CheckoutItem[],
  after: CheckoutItem[]
): SessionDiff {
  const beforeMap = new Map<string, CheckoutItem>();
  for (const item of before) beforeMap.set(keyOf(item), item);
  const afterMap = new Map<string, CheckoutItem>();
  for (const item of after) afterMap.set(keyOf(item), item);

  const added: CheckoutItem[] = [];
  const removed: CheckoutItem[] = [];
  const quantityChanges: { id: string; from: number; to: number }[] = [];

  for (const [id, item] of afterMap) {
    if (!beforeMap.has(id)) {
      added.push(item);
    } else {
      const prev = beforeMap.get(id) as CheckoutItem;
      const prevQty = prev.quantity ?? 1;
      const nextQty = item.quantity ?? 1;
      if (prevQty !== nextQty) {
        quantityChanges.push({ id, from: prevQty, to: nextQty });
      }
    }
  }
  for (const [id, item] of beforeMap) {
    if (!afterMap.has(id)) removed.push(item);
  }

  const totalBefore = before.reduce(
    (sum, i) => sum + i.amount * (i.quantity ?? 1),
    0
  );
  const totalAfter = after.reduce(
    (sum, i) => sum + i.amount * (i.quantity ?? 1),
    0
  );

  const diff: SessionDiff = {};
  if (added.length > 0) diff.added = added;
  if (removed.length > 0) diff.removed = removed;
  if (quantityChanges.length > 0) diff.quantityChanges = quantityChanges;
  if (totalBefore !== totalAfter) {
    diff.totalChange = { from: totalBefore, to: totalAfter };
  }
  return diff;
}
