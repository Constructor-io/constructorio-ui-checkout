import { extractSessionId } from '@src/providers/stripe/session';

describe(`${extractSessionId.name}: server`, () => {
  it('runs server-side without any browser globals', () => {
    expect(extractSessionId('cs_test_abc_secret_xyz')).toBe('cs_test_abc');
  });
});
