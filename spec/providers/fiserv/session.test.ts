import { getProviderAdapter, providerAdapters } from '@src/providers';
import { getSessionId, validateSession } from '@src/providers/fiserv/session';

import { fiservSession } from '../../factory';

describe(`${validateSession.name}: client`, () => {
  it('accepts a full session', () => {
    expect(validateSession(fiservSession.build())).toBe(true);
  });

  it('rejects a missing or empty field, and non-objects', () => {
    expect(validateSession(null)).toBe(false);
    expect(validateSession('x')).toBe(false);
    expect(validateSession({})).toBe(false);
    expect(validateSession(fiservSession.build({ accessToken: '' }))).toBe(
      false
    );
    const { keyId: _, ...noKeyId } = fiservSession.build();
    expect(validateSession(noKeyId)).toBe(false);
  });

  it('rejects a missing or unknown environment', () => {
    const { environment: _, ...noEnvironment } = fiservSession.build();
    expect(validateSession(noEnvironment)).toBe(false);
    expect(
      validateSession({ ...fiservSession.build(), environment: 'CERT' })
    ).toBe(false);
  });
});

describe(`${getSessionId.name}: client`, () => {
  it('returns sessionId', () => {
    expect(getSessionId(fiservSession.build({ sessionId: 'ps_1' }))).toBe(
      'ps_1'
    );
  });

  it('returns null without one', () => {
    expect(getSessionId({})).toBeNull();
    expect(getSessionId({ sessionId: '' })).toBeNull();
  });
});

describe(`${getProviderAdapter.name}: fiserv`, () => {
  it('is registered as a built-in', () => {
    expect(getProviderAdapter('fiserv')).toBe(providerAdapters.fiserv);
  });
});
