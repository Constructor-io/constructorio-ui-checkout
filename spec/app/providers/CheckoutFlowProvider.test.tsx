import React from 'react';

import { act, render, renderHook, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { CheckoutFlowStep } from '@src/app/components/CheckoutFlowStep';
import { useCheckoutFlow } from '@src/app/hooks/useCheckoutFlow';
import { CheckoutFlowProvider } from '@src/app/providers/CheckoutFlowProvider';
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

describe('CheckoutFlowProvider + useCheckoutFlow', () => {
  it('throws when the hook is used outside the Provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => renderHook(() => useCheckoutFlow())).toThrow(
      /must be used inside/
    );
    spy.mockRestore();
  });

  it('exposes the flow instance state and updates on transitions', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CheckoutFlowProvider {...baseConfig}>{children}</CheckoutFlowProvider>
    );
    const { result } = renderHook(() => useCheckoutFlow(), { wrapper });
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

  it('destroys the flow on unmount', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CheckoutFlowProvider {...baseConfig}>{children}</CheckoutFlowProvider>
    );
    const { result, unmount } = renderHook(() => useCheckoutFlow(), {
      wrapper,
    });
    const flow = result.current;
    unmount();
    // After destroy, next() emits an error via onEvent but does not throw.
    expect(() => void flow.next()).not.toThrow();
  });

  it('autoStart triggers start on mount', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CheckoutFlowProvider {...baseConfig} autoStart>
        {children}
      </CheckoutFlowProvider>
    );
    const { result } = renderHook(() => useCheckoutFlow(), { wrapper });
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.state.currentStepId).toBe('cart');
  });

  it('reactive cart prop updates the snapshot on rerender', async () => {
    const cartV1 = [{ name: 'A', amount: 10 }];
    const cartV2 = [
      { name: 'A', amount: 10 },
      { name: 'B', amount: 5 },
    ];
    const snapshots: number[] = [];

    function Probe() {
      const flow = useCheckoutFlow();
      snapshots.push(flow.state.cartSnapshot.length);
      return null;
    }

    function Harness({ cart }: { cart: typeof cartV1 }) {
      return (
        <CheckoutFlowProvider {...baseConfig} cart={cart} cartDebounceMs={0}>
          <Probe />
        </CheckoutFlowProvider>
      );
    }

    const { rerender } = render(<Harness cart={cartV1} />);
    rerender(<Harness cart={cartV2} />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
    expect(snapshots.at(-1)).toBe(2);
  });
});

describe('CheckoutFlowStep', () => {
  it('renders children only when its id matches currentStepId', async () => {
    const user = userEvent.setup();
    function App() {
      const flow = useCheckoutFlow();
      return (
        <>
          <button
            type="button"
            onClick={() => {
              void flow.start();
            }}
          >
            start
          </button>
          <button
            type="button"
            onClick={() => {
              void flow.next();
            }}
          >
            next
          </button>
          <CheckoutFlowStep id="cart">cart-view</CheckoutFlowStep>
          <CheckoutFlowStep id="auth">auth-view</CheckoutFlowStep>
          <CheckoutFlowStep id="pay">pay-view</CheckoutFlowStep>
        </>
      );
    }
    render(
      <CheckoutFlowProvider {...baseConfig}>
        <App />
      </CheckoutFlowProvider>
    );
    expect(screen.queryByText('cart-view')).not.toBeInTheDocument();
    await user.click(screen.getByText('start'));
    expect(await screen.findByText('cart-view')).toBeInTheDocument();
    await user.click(screen.getByText('next'));
    expect(await screen.findByText('auth-view')).toBeInTheDocument();
    expect(screen.queryByText('cart-view')).not.toBeInTheDocument();
  });
});
