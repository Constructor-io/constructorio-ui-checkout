import {
  computeCartDiff,
  extractSessionId,
  findStepIndex,
  getSessionIdFromResponse,
  isValidSessionResponse,
  makeInitialState,
  toError,
} from '@src/core/flow/helpers';

describe(`${makeInitialState.name}: server`, () => {
  it('runs server-side without any browser globals', () => {
    expect(() => makeInitialState()).not.toThrow();
  });
});

describe(`${findStepIndex.name}: server`, () => {
  it('runs server-side without any browser globals', () => {
    expect(findStepIndex([{ id: 'a' }], 'a')).toBe(0);
  });
});

describe(`${toError.name}: server`, () => {
  it('runs server-side without any browser globals', () => {
    expect(toError('x').message).toBe('x');
  });
});

describe(`${isValidSessionResponse.name}: server`, () => {
  it('runs server-side without any browser globals', () => {
    expect(isValidSessionResponse({ sessionId: 'session_abc' })).toBe(true);
  });
});

describe(`${getSessionIdFromResponse.name}: server`, () => {
  it('runs server-side without any browser globals', () => {
    expect(
      getSessionIdFromResponse({ sessionId: 'session_abc' }, 'stripe')
    ).toBe('session_abc');
  });
});

describe(`${extractSessionId.name}: server`, () => {
  it('runs server-side without any browser globals', () => {
    expect(extractSessionId('cs_test_abc_secret_xyz')).toBe('cs_test_abc');
  });
});

describe(`${computeCartDiff.name}: server`, () => {
  it('runs server-side without any browser globals', () => {
    const diff = computeCartDiff(
      [{ name: 'A', amount: 10 }],
      [
        { name: 'A', amount: 10 },
        { name: 'B', amount: 5 },
      ]
    );
    expect(diff.added).toEqual([{ name: 'B', amount: 5 }]);
  });
});
