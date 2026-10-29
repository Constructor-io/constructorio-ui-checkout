import {
  compileCartItemAccessors,
  computeCartDiff,
  computeCartTotal,
  findStepIndex,
  getSessionIdFromResponse,
  isValidSessionResponse,
  makeInitialState,
  toError,
} from '@src/core/flow/helpers';
import { FLOW_SCHEMA_VERSION } from '@src/core/types';
import type { BaseCartItem, StripePaymentSession } from '@src/types';

const accessors = compileCartItemAccessors<BaseCartItem>(undefined);

describe(`${makeInitialState.name}: client`, () => {
  it('returns a fresh idle state with the current schema version', () => {
    const state = makeInitialState();
    expect(state).toEqual({
      currentStepId: null,
      completedStepIds: [],
      cartSnapshot: [],
      cartTotal: 0,
      currency: null,
      sessionId: null,
      sessionStatus: 'idle',
      paymentInProgress: false,
      metadata: {},
      schemaVersion: FLOW_SCHEMA_VERSION,
    });
  });

  it('returns a new object each call (not a shared reference)', () => {
    const a = makeInitialState<BaseCartItem>();
    const b = makeInitialState<BaseCartItem>();
    a.cartSnapshot.push({ id: 'x', name: 'x', unitAmount: 1, quantity: 1 });
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
  it('accepts a valid stripe session shape', () => {
    expect(
      isValidSessionResponse(
        { clientSecret: 'cs_x_secret_y', publishableKey: 'pk_test' },
        'stripe'
      )
    ).toBe(true);
  });

  it('accepts any non-null object for non-stripe providers', () => {
    expect(
      isValidSessionResponse({ sessionId: 'session_abc' }, 'imaginary-psp')
    ).toBe(true);
    expect(isValidSessionResponse({}, 'imaginary-psp')).toBe(true);
  });

  it('rejects stripe response missing clientSecret or publishableKey', () => {
    expect(isValidSessionResponse({}, 'stripe')).toBe(false);
    expect(isValidSessionResponse({ clientSecret: 'cs_x' }, 'stripe')).toBe(
      false
    );
    expect(
      isValidSessionResponse({ publishableKey: 'pk_test' }, 'stripe')
    ).toBe(false);
    expect(
      isValidSessionResponse(
        { clientSecret: '', publishableKey: 'pk_test' },
        'stripe'
      )
    ).toBe(false);
  });

  it('rejects null', () => {
    expect(isValidSessionResponse(null, 'stripe')).toBe(false);
    expect(isValidSessionResponse(null, 'imaginary-psp')).toBe(false);
  });

  it('rejects arrays', () => {
    expect(isValidSessionResponse([], 'stripe')).toBe(false);
    expect(isValidSessionResponse([], 'imaginary-psp')).toBe(false);
  });

  it('rejects primitives', () => {
    expect(isValidSessionResponse('a string', 'stripe')).toBe(false);
    expect(isValidSessionResponse(42, 'stripe')).toBe(false);
    expect(isValidSessionResponse(undefined, 'stripe')).toBe(false);
  });
});

describe(`${getSessionIdFromResponse.name}: client`, () => {
  it('returns an explicit sessionId when present', () => {
    expect(
      getSessionIdFromResponse({ sessionId: 'session_abc' }, 'imaginary-psp')
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
    expect(getSessionIdFromResponse({}, 'imaginary-psp')).toBeNull();
  });

  it('returns null when sessionId is an empty string', () => {
    expect(
      getSessionIdFromResponse({ sessionId: '' }, 'imaginary-psp')
    ).toBeNull();
  });
});

describe(`${computeCartTotal.name}: client`, () => {
  it('returns 0 for an empty cart', () => {
    expect(computeCartTotal([], accessors)).toBe(0);
  });

  it('sums unitAmount * quantity', () => {
    expect(
      computeCartTotal(
        [
          { id: 'a', name: 'A', unitAmount: 1000, quantity: 2 },
          { id: 'b', name: 'B', unitAmount: 250, quantity: 3 },
        ],
        accessors
      )
    ).toBe(2750);
  });
});

describe(`${computeCartDiff.name}: client`, () => {
  const item = (id: string, unitAmount = 10, quantity = 1): BaseCartItem => ({
    id,
    name: id,
    unitAmount,
    quantity,
  });

  it('detects added items', () => {
    const diff = computeCartDiff(
      [item('a')],
      [item('a'), item('b')],
      accessors
    );
    expect(diff.added).toEqual([item('b')]);
    expect(diff.removed).toBeUndefined();
  });

  it('detects removed items', () => {
    const diff = computeCartDiff(
      [item('a'), item('b')],
      [item('a')],
      accessors
    );
    expect(diff.removed).toEqual([item('b')]);
  });

  it('detects quantity changes', () => {
    const diff = computeCartDiff(
      [item('a', 10, 1)],
      [item('a', 10, 3)],
      accessors
    );
    expect(diff.quantityChanges).toEqual([{ id: 'a', from: 1, to: 3 }]);
  });

  it('reports totalChange when totals differ', () => {
    const diff = computeCartDiff(
      [item('a', 10, 1)],
      [item('a', 10, 2)],
      accessors
    );
    expect(diff.totalChange).toEqual({ from: 10, to: 20 });
  });

  it('uses the id field as the identity key', () => {
    const before: BaseCartItem[] = [
      { id: 'price_1', name: 'A', unitAmount: 10, quantity: 1 },
    ];
    const after: BaseCartItem[] = [
      { id: 'price_1', name: 'A renamed', unitAmount: 10, quantity: 2 },
    ];
    const diff = computeCartDiff(before, after, accessors);
    expect(diff.added).toBeUndefined();
    expect(diff.removed).toBeUndefined();
    expect(diff.quantityChanges).toEqual([{ id: 'price_1', from: 1, to: 2 }]);
  });

  it('honors custom accessors for non-BaseCartItem shapes', () => {
    interface CustomItem {
      sku: string;
      priceCents: number;
      qty: number;
    }
    const customAccessors = compileCartItemAccessors<CustomItem>({
      id: 'sku',
      unitAmount: 'priceCents',
      quantity: 'qty',
    });
    const before: CustomItem[] = [{ sku: 'x', priceCents: 500, qty: 1 }];
    const after: CustomItem[] = [{ sku: 'x', priceCents: 500, qty: 3 }];
    const diff = computeCartDiff(before, after, customAccessors);
    expect(diff.quantityChanges).toEqual([{ id: 'x', from: 1, to: 3 }]);
    expect(diff.totalChange).toEqual({ from: 500, to: 1500 });
  });

  it('returns empty diff for identical carts', () => {
    const diff = computeCartDiff([item('a')], [item('a')], accessors);
    expect(diff).toEqual({});
  });
});
