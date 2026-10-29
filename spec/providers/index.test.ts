import { getProviderAdapter, providerAdapters } from '@src/providers';

describe(`${getProviderAdapter.name}: client`, () => {
  it('returns the stripe adapter', () => {
    expect(getProviderAdapter('stripe')).toBe(providerAdapters.stripe);
  });

  it('returns null for unknown providers', () => {
    expect(getProviderAdapter('imaginary-psp')).toBeNull();
  });

  it('returns null for Object.prototype keys', () => {
    expect(getProviderAdapter('toString')).toBeNull();
    expect(getProviderAdapter('__proto__')).toBeNull();
  });
});
