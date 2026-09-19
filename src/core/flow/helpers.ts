import type {
  BaseCartItem,
  BasePaymentSession,
  CartItemAccessors,
} from '@src/types';

import type {
  CheckoutFlowState,
  CheckoutSessionDiff,
  CheckoutStep,
  CheckoutStepId,
  CompiledCartItemAccessors,
} from '../types';
import { FLOW_SCHEMA_VERSION } from '../types';

export function makeInitialState<
  TItem = BaseCartItem,
>(): CheckoutFlowState<TItem> {
  return {
    currentStepId: null,
    completedStepIds: [],
    cartSnapshot: [],
    currency: null,
    sessionId: null,
    sessionStatus: 'idle',
    metadata: {},
    schemaVersion: FLOW_SCHEMA_VERSION,
  };
}

export function findStepIndex<TItem>(
  steps: CheckoutStep<TItem>[],
  id: CheckoutStepId | null
): number {
  if (id === null) return -1;
  return steps.findIndex((s) => s.id === id);
}

export function toError(reason: unknown): Error {
  if (reason instanceof Error) return reason;
  if (typeof reason === 'string') return new Error(reason);
  return new Error('Unknown error');
}

export function isValidSessionResponse(r: unknown): r is BasePaymentSession {
  return r !== null && typeof r === 'object';
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

export function getSessionIdFromResponse(
  session: BasePaymentSession,
  provider: string
): string | null {
  if (typeof session.sessionId === 'string' && session.sessionId.length > 0) {
    return session.sessionId;
  }
  if (provider === 'stripe') {
    const clientSecret = (session as { clientSecret?: unknown }).clientSecret;
    if (typeof clientSecret === 'string') return extractSessionId(clientSecret);
  }
  return null;
}

export function compileCartItemAccessors<TItem>(
  cfg: CartItemAccessors<TItem> | undefined
): CompiledCartItemAccessors<TItem> {
  const toGetter = <R>(
    spec: string | ((item: TItem) => R) | undefined,
    fallback: string
  ): ((item: TItem) => R) => {
    if (typeof spec === 'function') return spec;
    const key = (spec ?? fallback) as keyof TItem;
    return (item) => item[key] as R;
  };
  return {
    getId: toGetter<string>(cfg?.id, 'id'),
    getQuantity: toGetter<number>(cfg?.quantity, 'quantity'),
    getUnitAmount: toGetter<number>(cfg?.unitAmount, 'unitAmount'),
    getName: cfg?.name ? toGetter<string>(cfg.name, 'name') : null,
  };
}

export function computeCartDiff<TItem>(
  before: TItem[],
  after: TItem[],
  accessors: CompiledCartItemAccessors<TItem>
): CheckoutSessionDiff<TItem> {
  const { getId, getQuantity, getUnitAmount } = accessors;

  const beforeMap = new Map<string, TItem>();
  for (const item of before) beforeMap.set(getId(item), item);
  const afterMap = new Map<string, TItem>();
  for (const item of after) afterMap.set(getId(item), item);

  const added: TItem[] = [];
  const removed: TItem[] = [];
  const quantityChanges: { id: string; from: number; to: number }[] = [];

  for (const [id, item] of afterMap) {
    const prev = beforeMap.get(id);
    if (prev === undefined) {
      added.push(item);
    } else {
      const prevQty = getQuantity(prev);
      const nextQty = getQuantity(item);
      if (prevQty !== nextQty) {
        quantityChanges.push({ id, from: prevQty, to: nextQty });
      }
    }
  }
  for (const [id, item] of beforeMap) {
    if (!afterMap.has(id)) removed.push(item);
  }

  const totalBefore = before.reduce(
    (sum, i) => sum + getUnitAmount(i) * getQuantity(i),
    0
  );
  const totalAfter = after.reduce(
    (sum, i) => sum + getUnitAmount(i) * getQuantity(i),
    0
  );

  const diff: CheckoutSessionDiff<TItem> = {};
  if (added.length > 0) diff.added = added;
  if (removed.length > 0) diff.removed = removed;
  if (quantityChanges.length > 0) diff.quantityChanges = quantityChanges;
  if (totalBefore !== totalAfter) {
    diff.totalChange = { from: totalBefore, to: totalAfter };
  }
  return diff;
}
