import type { BasePaymentSession } from '@src/types';

const REQUIRED = [
  'sessionId',
  'accessToken',
  'publicKey',
  'keyId',
  'apiKey',
  'merchantId',
  'terminalId',
] as const;

export function validateSession(r: unknown): boolean {
  if (typeof r !== 'object' || r === null) return false;
  const s = r as Record<string, unknown>;
  return REQUIRED.every((key) => {
    const value = s[key];
    return typeof value === 'string' && value.length > 0;
  });
}

export function getSessionId(session: BasePaymentSession): string | null {
  return typeof session.sessionId === 'string' && session.sessionId.length > 0
    ? session.sessionId
    : null;
}
