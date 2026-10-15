import type { BasePaymentSession } from '@src/types';

export function validateSession(r: unknown): boolean {
  const s = r as { clientSecret?: unknown; publishableKey?: unknown };
  if (typeof s.clientSecret !== 'string' || s.clientSecret.length === 0) {
    return false;
  }
  if (typeof s.publishableKey !== 'string' || s.publishableKey.length === 0) {
    return false;
  }
  return true;
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

export function getSessionId(session: BasePaymentSession): string | null {
  const clientSecret = (session as { clientSecret?: unknown }).clientSecret;
  if (typeof clientSecret === 'string') return extractSessionId(clientSecret);
  return null;
}
