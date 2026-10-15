import React from 'react';

import { act, renderHook, waitFor } from '@testing-library/react';

import { useCioCheckout } from '@src/app/hooks/useCioCheckout';
import { useCioCheckoutSession } from '@src/app/hooks/useCioCheckoutSession';
import { CioCheckoutProvider } from '@src/app/providers/CioCheckoutProvider';
import type { StripePaymentSession } from '@src/types';

const sessionResponse = (id: string): StripePaymentSession => ({
  clientSecret: `${id}_secret_xyz`,
  publishableKey: 'pk_test',
});

const makeWrapper =
  (onCreateSession?: () => Promise<StripePaymentSession>) =>
  ({ children }: { children: React.ReactNode }) => (
    <CioCheckoutProvider
      provider="stripe"
      steps={[{ id: 'payment' }]}
      onCreateSession={onCreateSession}
    >
      {children}
    </CioCheckoutProvider>
  );

const useBoth = () => ({
  session: useCioCheckoutSession(),
  flow: useCioCheckout(),
});

describe(`${useCioCheckoutSession.name}: client`, () => {
  it('creates a session when the status is idle', async () => {
    const onCreateSession = vi.fn(() =>
      Promise.resolve(sessionResponse('cs_test_a'))
    );
    const { result } = renderHook(() => useCioCheckoutSession(), {
      wrapper: makeWrapper(onCreateSession),
    });
    await waitFor(() => expect(result.current.sessionStatus).toBe('active'));
    expect(onCreateSession).toHaveBeenCalledTimes(1);
    expect(result.current.session).toEqual(sessionResponse('cs_test_a'));
    expect(result.current.missingSession).toBe(false);
  });

  it('does nothing more once a session exists', async () => {
    const onCreateSession = vi.fn(() =>
      Promise.resolve(sessionResponse('cs_test_a'))
    );
    const { result, rerender } = renderHook(() => useCioCheckoutSession(), {
      wrapper: makeWrapper(onCreateSession),
    });
    await waitFor(() => expect(result.current.session).not.toBeNull());
    rerender();
    rerender();
    expect(onCreateSession).toHaveBeenCalledTimes(1);
  });

  it('recreates the session when the status is expired', async () => {
    let n = 0;
    const onCreateSession = vi.fn(() =>
      Promise.resolve(sessionResponse(`cs_test_${(n += 1)}`))
    );
    const { result } = renderHook(useBoth, {
      wrapper: makeWrapper(onCreateSession),
    });
    await waitFor(() => expect(result.current.session.session).not.toBeNull());
    act(() => {
      result.current.flow.markExpired();
    });
    await waitFor(() =>
      expect(result.current.session.session).toEqual(
        sessionResponse('cs_test_2')
      )
    );
    expect(onCreateSession).toHaveBeenCalledTimes(2);
  });

  it('retry calls flow.recreate', async () => {
    let n = 0;
    const onCreateSession = vi.fn(() =>
      Promise.resolve(sessionResponse(`cs_test_${(n += 1)}`))
    );
    const { result } = renderHook(() => useCioCheckoutSession(), {
      wrapper: makeWrapper(onCreateSession),
    });
    await waitFor(() => expect(result.current.session).not.toBeNull());
    await act(async () => {
      await result.current.retry();
    });
    expect(onCreateSession).toHaveBeenCalledTimes(2);
    expect(result.current.session).toEqual(sessionResponse('cs_test_2'));
  });

  it('sets missingSession when the flow has no onCreateSession', async () => {
    const { result } = renderHook(() => useCioCheckoutSession(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.sessionStatus).toBe('active'));
    expect(result.current.session).toBeNull();
    expect(result.current.missingSession).toBe(true);
  });
});
