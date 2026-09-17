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

describe(`${CheckoutFlowProvider.name}: client`, () => {
  describe('lifecycle', () => {
    it('destroys the flow on unmount', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <CheckoutFlowProvider {...baseConfig}>{children}</CheckoutFlowProvider>
      );
      const { result, unmount } = renderHook(() => useCheckoutFlow(), {
        wrapper,
      });
      const flow = result.current;
      unmount();
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

  describe('prop shims', () => {
    it('guard shim reads the latest guard on each invocation', async () => {
      let allow = false;
      const guardFn = vi.fn(() => Promise.resolve(allow));
      function Harness() {
        return (
          <CheckoutFlowProvider
            steps={[{ id: 'a' }, { id: 'b', guard: () => guardFn() }]}
            onCreateSession={stubSession}
          >
            <>
              <TriggerNext />
              <CheckoutFlowStep id="a">a-view</CheckoutFlowStep>
              <CheckoutFlowStep id="b">b-view</CheckoutFlowStep>
            </>
          </CheckoutFlowProvider>
        );
      }
      function TriggerNext() {
        const flow = useCheckoutFlow();
        React.useEffect(() => {
          void flow.start();
        }, [flow]);
        return (
          <button type="button" onClick={() => void flow.next()}>
            next
          </button>
        );
      }
      render(<Harness />);
      expect(await screen.findByText('a-view')).toBeInTheDocument();
      await userEvent.setup().click(screen.getByText('next'));
      expect(guardFn).toHaveBeenCalled();
      expect(screen.getByText('a-view')).toBeInTheDocument();
      allow = true;
      await userEvent.setup().click(screen.getByText('next'));
      expect(await screen.findByText('b-view')).toBeInTheDocument();
    });

    it('forwards onUpdateSession, onEvent, and authenticate through propsRef shims', async () => {
      const onUpdateSession = vi.fn(() =>
        Promise.resolve({
          clientSecret: 'cs_test_updated_secret',
          publishableKey: 'pk_test',
        })
      );
      const onEvent = vi.fn();
      const authenticate = vi.fn(() => Promise.resolve({ userId: 'u1' }));

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <CheckoutFlowProvider
          steps={[{ id: 'a' }, { id: 'b' }]}
          onCreateSession={stubSession}
          onUpdateSession={onUpdateSession}
          onEvent={onEvent}
          authenticate={authenticate}
        >
          {children}
        </CheckoutFlowProvider>
      );
      const { result } = renderHook(() => useCheckoutFlow(), { wrapper });
      await act(async () => {
        await result.current.start();
      });
      expect(authenticate).toHaveBeenCalled();
      await act(async () => {
        await result.current.createSession();
      });
      await act(async () => {
        await result.current.updateSession({ metadata: { touched: true } });
      });
      expect(onUpdateSession).toHaveBeenCalled();
      expect(onEvent).toHaveBeenCalled();
    });

    it('router wrap forwards getCurrentPath/push/subscribe through propsRef', async () => {
      let currentPath = '';
      const push = vi.fn((p: string) => {
        currentPath = p;
      });
      const subscribers: Array<(p: string) => void> = [];
      const subscribe = vi.fn((cb: (p: string) => void) => {
        subscribers.push(cb);
        return () => {
          const i = subscribers.indexOf(cb);
          if (i >= 0) subscribers.splice(i, 1);
        };
      });
      const router = {
        push,
        getCurrentPath: () => currentPath,
        subscribe,
      };
      function Harness() {
        return (
          <CheckoutFlowProvider
            steps={[
              { id: 'a', path: '/a' },
              { id: 'b', path: '/b' },
            ]}
            onCreateSession={stubSession}
            router={router}
            autoStart
          >
            <CheckoutFlowStep id="a">a-view</CheckoutFlowStep>
            <CheckoutFlowStep id="b">b-view</CheckoutFlowStep>
          </CheckoutFlowProvider>
        );
      }
      render(<Harness />);
      await act(async () => {
        await Promise.resolve();
      });
      expect(subscribe).toHaveBeenCalled();
      expect(push).toHaveBeenCalledWith('/a');
      await act(async () => {
        subscribers[0]?.('/b');
        await Promise.resolve();
      });
      expect(await screen.findByText('b-view')).toBeInTheDocument();
    });
  });
});
