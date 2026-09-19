import {
  computeCartDiff,
  extractSessionId,
  findStepIndex,
  getSessionIdFromResponse,
  isValidSessionResponse,
  makeInitialState,
  toError,
} from '@src/core/flow/helpers';
import { FLOW_SCHEMA_VERSION } from '@src/core/types';
import type { CheckoutItem, StripePaymentSession } from '@src/types';

describe(`${makeInitialState.name}: client`, () => {
  it('returns a fresh idle state with the current schema version', () => {
    const state = makeInitialState();
    expect(state).toEqual({
      currentStepId: null,
      completedStepIds: [],
      cartSnapshot: [],
      sessionId: null,
      sessionStatus: 'idle',
      metadata: {},
      schemaVersion: FLOW_SCHEMA_VERSION,
    });
  });

  it('returns a new object each call (not a shared reference)', () => {
    const a = makeInitialState();
    const b = makeInitialState();
    a.cartSnapshot.push({ name: 'x', amount: 1 });
    expect(b.cartSnapshot).toEqual([]);
  });
});

describe(`${findStepIndex.name}: client`, () => {
  const steps = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

  it('returns the index for a matching id', () => {
    expect(findStepIndex(steps, 'b')).toBe(1);
  });

  it('returns -1 for an unknown id', () => {
    expect(findStepIndex(steps, 'missing')).toBe(-1);
  });

  it('returns -1 for a null id', () => {
    expect(findStepIndex(steps, null)).toBe(-1);
  });
});

describe(`${toError.name}: client`, () => {
  it('returns the same Error when given an Error', () => {
    const err = new Error('boom');
    expect(toError(err)).toBe(err);
  });

  it('wraps a string as an Error', () => {
    const err = toError('nope');
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('nope');
  });

  it('falls back to "Unknown error" for non-Error non-string values', () => {
    expect(toError(42).message).toBe('Unknown error');
    expect(toError(null).message).toBe('Unknown error');
    expect(toError(undefined).message).toBe('Unknown error');
    expect(toError({ code: 'X' }).message).toBe('Unknown error');
  });
});

describe(`${isValidSessionResponse.name}: client`, () => {
  it('accepts any non-null object', () => {
    expect(isValidSessionResponse({ clientSecret: 'cs_x' })).toBe(true);
    expect(isValidSessionResponse({ sessionId: 'session_abc' })).toBe(true);
    expect(isValidSessionResponse({})).toBe(true);
  });

  it('rejects null', () => {
    expect(isValidSessionResponse(null)).toBe(false);
  });

  it('rejects primitives', () => {
    expect(isValidSessionResponse('a string')).toBe(false);
    expect(isValidSessionResponse(42)).toBe(false);
    expect(isValidSessionResponse(undefined)).toBe(false);
  });
});

describe(`${getSessionIdFromResponse.name}: client`, () => {
  it('returns an explicit sessionId when present', () => {
    expect(
      getSessionIdFromResponse({ sessionId: 'session_abc' }, 'fiserv')
    ).toBe('session_abc');
  });

  it('prefers explicit sessionId over Stripe clientSecret extraction', () => {
    expect(
      getSessionIdFromResponse(
        {
          sessionId: 'session_explicit',
          clientSecret: 'cs_test_abc_secret_xyz',
          publishableKey: 'pk_test',
        } as StripePaymentSession,
        'stripe'
      )
    ).toBe('session_explicit');
  });

  it('falls back to Stripe clientSecret extraction when sessionId is absent', () => {
    expect(
      getSessionIdFromResponse(
        {
          clientSecret: 'cs_test_abc_secret_xyz',
          publishableKey: 'pk_test',
        } as StripePaymentSession,
        'stripe'
      )
    ).toBe('cs_test_abc');
  });

  it('returns null for non-Stripe providers without an explicit sessionId', () => {
    expect(getSessionIdFromResponse({}, 'fiserv')).toBeNull();
  });

  it('returns null when sessionId is an empty string', () => {
    expect(getSessionIdFromResponse({ sessionId: '' }, 'fiserv')).toBeNull();
  });
});

describe(`${extractSessionId.name}: client`, () => {
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

describe(`${computeCartDiff.name}: client`, () => {
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
