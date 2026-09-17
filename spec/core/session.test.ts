import { computeCartDiff, extractSessionId } from '@src/core/flow/session';
import type { CheckoutItem } from '@src/types';

describe('extractSessionId', () => {
  it('extracts the id prefix from a Stripe client_secret', () => {
    expect(extractSessionId('cs_test_abc_secret_xyz')).toBe('cs_test_abc');
  });

  it('handles live-mode format', () => {
    expect(extractSessionId('cs_live_a1b2c3_secret_deadbeef')).toBe(
      'cs_live_a1b2c3'
    );
  });

  it('returns null for null, empty, or malformed input', () => {
    expect(extractSessionId(null)).toBeNull();
    expect(extractSessionId(undefined)).toBeNull();
    expect(extractSessionId('')).toBeNull();
    expect(extractSessionId('no-secret-suffix')).toBeNull();
    expect(extractSessionId('_secret_leading')).toBeNull();
  });

  it('does not expose the secret portion of the token', () => {
    const id = extractSessionId('cs_test_abc_secret_supersecret');
    expect(id).not.toContain('supersecret');
    expect(id).not.toContain('secret');
  });
});

describe('computeCartDiff', () => {
  const item = (name: string, amount = 10, quantity = 1): CheckoutItem => ({
    name,
    amount,
    quantity,
  });

  it('detects added items', () => {
    const diff = computeCartDiff([item('a')], [item('a'), item('b')]);
    expect(diff.added).toEqual([item('b')]);
    expect(diff.removed).toBeUndefined();
  });

  it('detects removed items', () => {
    const diff = computeCartDiff([item('a'), item('b')], [item('a')]);
    expect(diff.removed).toEqual([item('b')]);
  });

  it('detects quantity changes', () => {
    const diff = computeCartDiff([item('a', 10, 1)], [item('a', 10, 3)]);
    expect(diff.quantityChanges).toEqual([{ id: 'a', from: 1, to: 3 }]);
  });

  it('reports totalChange when totals differ', () => {
    const diff = computeCartDiff([item('a', 10, 1)], [item('a', 10, 2)]);
    expect(diff.totalChange).toEqual({ from: 10, to: 20 });
  });

  it('uses priceId as the identity key when present', () => {
    const before: CheckoutItem[] = [
      { name: 'A', amount: 10, priceId: 'price_1' },
    ];
    const after: CheckoutItem[] = [
      { name: 'A renamed', amount: 10, priceId: 'price_1', quantity: 2 },
    ];
    const diff = computeCartDiff(before, after);
    expect(diff.added).toBeUndefined();
    expect(diff.removed).toBeUndefined();
    expect(diff.quantityChanges).toEqual([{ id: 'price_1', from: 1, to: 2 }]);
  });

  it('returns empty diff for identical carts', () => {
    const diff = computeCartDiff([item('a')], [item('a')]);
    expect(diff).toEqual({});
  });
});
