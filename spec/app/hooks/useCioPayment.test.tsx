import { act, renderHook } from '@testing-library/react';
import type React from 'react';

import { useCioPayment } from '@src/app/hooks/useCioPayment';
import { CioPaymentProvider } from '@src/app/providers/CioPaymentProvider';
import type { CheckoutFlowConfig } from '@src/core/types';

const stubSession = () =>
  Promise.resolve({
    clientSecret: 'cs_test_a_secret_x',
    publishableKey: 'pk_test',
  });

const baseConfig: CheckoutFlowConfig = {
  steps: [{ id: 'cart' }, { id: 'auth' }, { id: 'pay' }],
  onCreateSession: stubSession,
};

describe(`${useCioPayment.name}: client`, () => {
  it('throws when used outside the Provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => renderHook(() => useCioPayment())).toThrow(
      /must be used inside/
    );
    spy.mockRestore();
  });

  it('exposes flow instance state and updates on transitions', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CioPaymentProvider {...baseConfig}>{children}</CioPaymentProvider>
    );
    const { result } = renderHook(() => useCioPayment(), { wrapper });
    expect(result.current.state.currentStepId).toBeNull();
    await act(async () => {
      await result.current.start();
    });
    expect(result.current.state.currentStepId).toBe('cart');
    await act(async () => {
      await result.current.next();
    });
    expect(result.current.state.currentStepId).toBe('auth');
  });
});
