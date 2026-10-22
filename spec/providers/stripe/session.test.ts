import {
  extractSessionId,
  getSessionId,
  validateSession,
} from '@src/providers/stripe/session';
import type { StripePaymentSession } from '@src/types';

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

describe(`${validateSession.name}: client`, () => {
  it('accepts a session with clientSecret and publishableKey', () => {
    expect(
      validateSession({
        clientSecret: 'cs_x_secret_y',
        publishableKey: 'pk_test',
      })
    ).toBe(true);
  });

  it('rejects a session missing either field', () => {
    expect(validateSession({})).toBe(false);
    expect(validateSession({ clientSecret: 'cs_x' })).toBe(false);
    expect(validateSession({ publishableKey: 'pk_test' })).toBe(false);
  });
});

describe(`${getSessionId.name}: client`, () => {
  it('extracts the id from clientSecret', () => {
    expect(
      getSessionId({
        clientSecret: 'cs_test_abc_secret_xyz',
        publishableKey: 'pk_test',
      } as StripePaymentSession)
    ).toBe('cs_test_abc');
  });

  it('returns null without a clientSecret', () => {
    expect(getSessionId({})).toBeNull();
  });
});
