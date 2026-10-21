import { useState } from 'react';

import type { BaseCartItem, BasePaymentSession } from '@src/types';

export interface FakePaySession extends BasePaymentSession {
  token: string;
}

export const DEMO_CART: BaseCartItem[] = [
  { id: 'sku-1', name: 'Trail runner', unitAmount: 8900, quantity: 1 },
  { id: 'sku-2', name: 'Wool socks', unitAmount: 1200, quantity: 2 },
];

const delay = <T,>(value: T, ms = 150): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

let sessionCount = 0;

export const fakePayApi = {
  createSession: (): Promise<FakePaySession> => {
    sessionCount += 1;
    return delay({
      sessionId: `fp_session_${sessionCount}`,
      token: `fp_token_${sessionCount}`,
    });
  },
  charge: (token: string): Promise<{ ok: boolean; message?: string }> =>
    delay(token ? { ok: true } : { ok: false, message: 'Missing token' }),
  verifyOrder: (): Promise<{ success: boolean; message: string }> =>
    delay({ success: true, message: 'Order FP-1001 confirmed' }),
};

export const formatCents = (cents: number): string =>
  `$${(cents / 100).toFixed(2)}`;

interface FakePayWidgetProps {
  session: FakePaySession;
  amount: number;
  onSubmit: () => void;
  onSuccess: () => void;
  onFailure: (error: Error) => void;
}

export function FakePayWidget({
  session,
  amount,
  onSubmit,
  onSuccess,
  onFailure,
}: FakePayWidgetProps) {
  const [busy, setBusy] = useState(false);

  const pay = async () => {
    setBusy(true);
    onSubmit();
    const result = await fakePayApi.charge(session.token);
    setBusy(false);
    if (result.ok) onSuccess();
    else onFailure(new Error(result.message ?? 'Payment failed'));
  };

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
      <p style={{ margin: '0 0 8px' }}>FakePay session {session.sessionId}</p>
      <button type="button" onClick={() => void pay()} disabled={busy}>
        {busy ? 'Paying...' : `Pay ${formatCents(amount)}`}
      </button>
    </div>
  );
}
