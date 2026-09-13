import type { CheckoutItem } from '@src/types';

import type { SessionDiff } from './types';

// Stripe client_secret format: `<session_id>_secret_<opaque>`. Never expose
// or log the full client_secret — only the session_id prefix is safe.
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
