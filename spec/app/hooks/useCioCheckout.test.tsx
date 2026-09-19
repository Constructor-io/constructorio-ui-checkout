import { useEffect } from 'react';

import {
  act,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import type React from 'react';

import { CioFlowStep } from '@src/app/components/CioFlowStep';
import { useCioCheckout } from '@src/app/hooks/useCioCheckout';
import { CioCheckoutProvider } from '@src/app/providers/CioCheckoutProvider';
import type { CheckoutFlowConfig } from '@src/core/types';
import type { BasePaymentSession } from '@src/types';

interface CustomSession extends BasePaymentSession {
  approvalToken: string;
  merchantId: string;
}

declare module '@src/types' {
  interface PaymentSessionMap {
    custom: CustomSession;
  }
}

const stubSession = () =>
  Promise.resolve({
    clientSecret: 'cs_test_a_secret_x',
    publishableKey: 'pk_test',
  });

const baseConfig: CheckoutFlowConfig = {
  provider: 'stripe',
  steps: [{ id: 'cart' }, { id: 'auth' }, { id: 'pay' }],
  onCreateSession: stubSession,
};

describe(`${useCioCheckout.name}: client`, () => {
  it('throws when used outside the Provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => renderHook(() => useCioCheckout())).toThrow(
      /must be used inside/
    );
    spy.mockRestore();
  });

  it('exposes flow instance state and updates on transitions', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CioCheckoutProvider {...baseConfig}>{children}</CioCheckoutProvider>
    );
    const { result } = renderHook(() => useCioCheckout(), { wrapper });
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

  describe('custom PSP via headless hook', () => {
    it('drives a custom-provider flow through mocked steps to completion', async () => {
      const customSession = vi.fn(() =>
        Promise.resolve<CustomSession>({
          sessionId: 'session_test_1',
          approvalToken: 'tok_test',
          merchantId: 'merchant-test',
        })
      );

      function CustomCartStep() {
        const flow = useCioCheckout<'custom', unknown>();
        return (
          <button type="button" onClick={() => void flow.next()}>
            Cart: continue
          </button>
        );
      }

      function CustomPaymentStep() {
        const flow = useCioCheckout<'custom', unknown>();
        const session = flow.getSession();
        const sessionStatus = flow.state.sessionStatus;
        useEffect(() => {
          if (sessionStatus === 'idle') void flow.createSession();
        }, [flow, sessionStatus]);
        return (
          <div>
            <span data-testid="provider">{flow.provider}</span>
            <span data-testid="token">
              {session?.approvalToken ?? 'no-session'}
            </span>
            <span data-testid="merchant">
              {session?.merchantId ?? 'no-session'}
            </span>
            <button type="button" onClick={() => void flow.next()}>
              Pay
            </button>
          </div>
        );
      }

      function CustomDoneStep() {
        return <span data-testid="done">complete</span>;
      }

      const user = userEvent.setup();
      render(
        <CioCheckoutProvider<'custom', unknown>
          provider="custom"
          steps={[{ id: 'cart' }, { id: 'pay' }, { id: 'done' }]}
          onCreateSession={customSession}
          autoStart
        >
          <CioFlowStep id="cart">
            <CustomCartStep />
          </CioFlowStep>
          <CioFlowStep id="pay">
            <CustomPaymentStep />
          </CioFlowStep>
          <CioFlowStep id="done">
            <CustomDoneStep />
          </CioFlowStep>
        </CioCheckoutProvider>
      );

      await user.click(await screen.findByText('Cart: continue'));

      const paymentStep = await screen.findByText('Pay');
      expect(screen.getByTestId('provider').textContent).toBe('custom');
      await waitFor(() =>
        expect(screen.getByTestId('token').textContent).toBe('tok_test')
      );
      expect(screen.getByTestId('merchant').textContent).toBe('merchant-test');

      await user.click(paymentStep);
      expect(await screen.findByTestId('done')).toHaveTextContent('complete');
      expect(customSession).toHaveBeenCalled();
    });
  });
});
