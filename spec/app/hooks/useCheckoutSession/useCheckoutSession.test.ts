import { act, renderHook, waitFor } from '@testing-library/react';

import {
  DEMO_CLIENT_SECRET,
  DEMO_PUBLISHABLE_KEY,
} from '@spec/__tests__/constants';
import * as factories from '@spec/factory';

import useCheckoutSession from '@src/app/hooks/useCheckoutSession';
import checkoutRegistry from '@src/registry/CheckoutRegistry';
import type { CioCheckoutCallbacks, CioCheckoutProps } from '@src/types';

vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn().mockResolvedValue({ elements: vi.fn() }),
}));

describe(`${useCheckoutSession.name}: client`, () => {
  afterEach(() => {
    checkoutRegistry.clear();
  });

  it('returns initial state', () => {
    const props = factories.checkoutProps.build();
    const { result } = renderHook(() => useCheckoutSession(props));

    expect(result.current.isOpen).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.session).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.fulfillmentStatus).toBe('idle');
    expect(result.current.fulfillmentResult).toBeNull();
  });

  it('opens checkout with a static session', async () => {
    const props = factories.checkoutProps.build();
    const { result } = renderHook(() => useCheckoutSession(props));

    act(() => {
      result.current.openCheckout();
    });

    await waitFor(() => {
      expect(result.current.isOpen).toBe(true);
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.session).toEqual({
      clientSecret: DEMO_CLIENT_SECRET,
      publishableKey: DEMO_PUBLISHABLE_KEY,
    });
  });

  it('opens checkout with a function session', async () => {
    const sessionResponse = factories.checkoutSessionResponse.build();
    const sessionFn = vi.fn().mockResolvedValue(sessionResponse);
    const props: CioCheckoutProps = { session: sessionFn };
    const { result } = renderHook(() => useCheckoutSession(props));

    act(() => {
      result.current.openCheckout();
    });

    await waitFor(() => {
      expect(result.current.isOpen).toBe(true);
    });
    expect(sessionFn).toHaveBeenCalled();
    expect(result.current.session).toEqual(sessionResponse);
  });

  it('resolves a single item to an array', async () => {
    const item = factories.checkoutItem.build({ name: 'Widget' });
    const onComplete = vi.fn();
    const callbacks: CioCheckoutCallbacks = { onComplete };
    const props: CioCheckoutProps = {
      session: factories.checkoutSessionResponse.build(),
      items: item,
    };
    const { result } = renderHook(() => useCheckoutSession(props, callbacks));

    act(() => {
      result.current.openCheckout();
    });

    await waitFor(() => {
      expect(result.current.isOpen).toBe(true);
    });
    act(() => {
      result.current.handleComplete();
    });

    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [item],
      })
    );
  });

  it('resolves an array of items', async () => {
    const items = [
      factories.checkoutItem.build({ name: 'A' }),
      factories.checkoutItem.build({ name: 'B' }),
    ];
    const onComplete = vi.fn();
    const callbacks: CioCheckoutCallbacks = { onComplete };
    const props: CioCheckoutProps = {
      session: factories.checkoutSessionResponse.build(),
      items,
    };
    const { result } = renderHook(() => useCheckoutSession(props, callbacks));

    act(() => {
      result.current.openCheckout();
    });

    await waitFor(() => {
      expect(result.current.isOpen).toBe(true);
    });
    act(() => {
      result.current.handleComplete();
    });

    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ items }));
  });

  it('resolves items from an async function', async () => {
    const item = factories.checkoutItem.build({ name: 'Async Widget' });
    const asyncItems = vi.fn().mockResolvedValue(item);
    const onComplete = vi.fn();
    const callbacks: CioCheckoutCallbacks = { onComplete };
    const props: CioCheckoutProps = {
      session: factories.checkoutSessionResponse.build(),
      items: asyncItems,
    };
    const { result } = renderHook(() => useCheckoutSession(props, callbacks));

    act(() => {
      result.current.openCheckout();
    });

    await waitFor(() => {
      expect(result.current.isOpen).toBe(true);
    });
    act(() => {
      result.current.handleComplete();
    });

    expect(asyncItems).toHaveBeenCalled();
    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({ items: [item] })
    );
  });

  it('handles session error', async () => {
    const error = new Error('Session fetch failed');
    const sessionFn = vi.fn().mockRejectedValue(error);
    const onError = vi.fn();
    const callbacks: CioCheckoutCallbacks = { onError };
    const props: CioCheckoutProps = { session: sessionFn };
    const { result } = renderHook(() => useCheckoutSession(props, callbacks));

    act(() => {
      result.current.openCheckout();
    });

    await waitFor(() => {
      expect(result.current.error).toEqual(error);
    });
    expect(result.current.isOpen).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(onError).toHaveBeenCalledWith(error);
  });

  it('wraps non-Error rejections into Error objects', async () => {
    const sessionFn = vi.fn().mockRejectedValue('string error');
    const onError = vi.fn();
    const callbacks: CioCheckoutCallbacks = { onError };
    const props: CioCheckoutProps = { session: sessionFn };
    const { result } = renderHook(() => useCheckoutSession(props, callbacks));

    act(() => {
      result.current.openCheckout();
    });

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(Error);
    });
    expect(result.current.error?.message).toBe('string error');
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'string error' }) as Error
    );
  });

  it('calls onClose when closing checkout', async () => {
    const onClose = vi.fn();
    const callbacks: CioCheckoutCallbacks = { onClose };
    const props = factories.checkoutProps.build();
    const { result } = renderHook(() => useCheckoutSession(props, callbacks));

    act(() => {
      result.current.openCheckout();
    });

    await waitFor(() => {
      expect(result.current.isOpen).toBe(true);
    });
    act(() => {
      result.current.closeCheckout();
    });

    expect(result.current.isOpen).toBe(false);
    expect(result.current.session).toBeNull();
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onComplete with extracted sessionId', async () => {
    const onComplete = vi.fn();
    const callbacks: CioCheckoutCallbacks = { onComplete };
    const props: CioCheckoutProps = {
      session: {
        clientSecret: 'cs_test_abc123_secret_xyz789',
        publishableKey: DEMO_PUBLISHABLE_KEY,
      },
    };
    const { result } = renderHook(() => useCheckoutSession(props, callbacks));

    act(() => {
      result.current.openCheckout();
    });

    await waitFor(() => {
      expect(result.current.isOpen).toBe(true);
    });
    act(() => {
      result.current.handleComplete();
    });

    expect(onComplete).toHaveBeenCalledWith({
      sessionId: 'cs_test_abc123',
      items: undefined,
    });
  });

  it('resets all state', async () => {
    const props = factories.checkoutProps.build();
    const { result } = renderHook(() => useCheckoutSession(props));

    act(() => {
      result.current.openCheckout();
    });

    await waitFor(() => {
      expect(result.current.isOpen).toBe(true);
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.isOpen).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.session).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.fulfillmentStatus).toBe('idle');
    expect(result.current.fulfillmentResult).toBeNull();
  });

  it('falls back to registry session when no props.session provided', async () => {
    const registrySession = factories.checkoutSessionResponse.build();
    checkoutRegistry.register(registrySession);

    const props: CioCheckoutProps = {};
    const { result } = renderHook(() => useCheckoutSession(props));

    act(() => {
      result.current.openCheckout();
    });

    await waitFor(() => {
      expect(result.current.session).toEqual(registrySession);
    });
  });

  it('falls back to raw clientSecret when format does not match', async () => {
    const onComplete = vi.fn();
    const callbacks: CioCheckoutCallbacks = { onComplete };
    const props: CioCheckoutProps = {
      session: {
        clientSecret: 'some_unknown_format',
        publishableKey: DEMO_PUBLISHABLE_KEY,
      },
    };
    const { result } = renderHook(() => useCheckoutSession(props, callbacks));

    act(() => {
      result.current.openCheckout();
    });

    await waitFor(() => {
      expect(result.current.isOpen).toBe(true);
    });
    act(() => {
      result.current.handleComplete();
    });

    expect(onComplete).toHaveBeenCalledWith({
      sessionId: 'some_unknown_format',
      items: undefined,
    });
  });

  it('does not open checkout when triggerWhen returns false', () => {
    const sessionFn = vi
      .fn()
      .mockResolvedValue(factories.checkoutSessionResponse.build());
    const props: CioCheckoutProps = {
      session: sessionFn,
      triggerWhen: () => false,
    };
    const { result } = renderHook(() => useCheckoutSession(props));

    act(() => {
      result.current.openCheckout();
    });

    expect(result.current.isOpen).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(sessionFn).not.toHaveBeenCalled();
  });

  it('opens checkout when triggerWhen returns true', async () => {
    const props: CioCheckoutProps = {
      session: factories.checkoutSessionResponse.build(),
      triggerWhen: () => true,
    };
    const { result } = renderHook(() => useCheckoutSession(props));

    act(() => {
      result.current.openCheckout();
    });

    await waitFor(() => {
      expect(result.current.isOpen).toBe(true);
    });
  });

  it('evaluates triggerWhen with triggerState', () => {
    const triggerWhen = vi.fn(
      (state: Record<string, unknown>) => !!state.ready
    );
    const props: CioCheckoutProps = {
      session: factories.checkoutSessionResponse.build(),
      triggerWhen,
      triggerState: { ready: false },
    };
    const { result } = renderHook(() => useCheckoutSession(props));

    act(() => {
      result.current.openCheckout();
    });

    expect(triggerWhen).toHaveBeenCalledWith({ ready: false });
    expect(result.current.isOpen).toBe(false);
  });

  it('defaults triggerState to empty object when not provided', () => {
    const triggerWhen = vi.fn(() => false);
    const props: CioCheckoutProps = {
      session: factories.checkoutSessionResponse.build(),
      triggerWhen,
    };
    const { result } = renderHook(() => useCheckoutSession(props));

    act(() => {
      result.current.openCheckout();
    });

    expect(triggerWhen).toHaveBeenCalledWith({});
    expect(result.current.isOpen).toBe(false);
  });

  it('does not call onComplete when sessionResponse is null', () => {
    const onComplete = vi.fn();
    const callbacks: CioCheckoutCallbacks = { onComplete };
    const props = factories.checkoutProps.build();
    const { result } = renderHook(() => useCheckoutSession(props, callbacks));

    // Call handleComplete without opening checkout (sessionResponse is null)
    act(() => {
      result.current.handleComplete();
    });

    expect(onComplete).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Fulfillment
  // ---------------------------------------------------------------------------

  describe('fulfillment', () => {
    it('runs onFulfill after payment completes and sets fulfilled status', async () => {
      const onFulfill = vi
        .fn()
        .mockResolvedValue({ success: true, message: 'Order #1234' });
      const onComplete = vi.fn();
      const callbacks: CioCheckoutCallbacks = { onComplete, onFulfill };
      const props: CioCheckoutProps = {
        session: factories.checkoutSessionResponse.build(),
      };
      const { result } = renderHook(() => useCheckoutSession(props, callbacks));

      act(() => {
        result.current.openCheckout();
      });

      await waitFor(() => {
        expect(result.current.isOpen).toBe(true);
      });

      act(() => {
        result.current.handleComplete();
      });

      // Checkout should close, fulfillment should be pending
      expect(result.current.isOpen).toBe(false);
      expect(result.current.fulfillmentStatus).toBe('pending');

      await waitFor(() => {
        expect(result.current.fulfillmentStatus).toBe('fulfilled');
      });

      expect(result.current.fulfillmentResult).toEqual({
        success: true,
        message: 'Order #1234',
      });
      expect(onFulfill).toHaveBeenCalledTimes(1);
      const fulfillArg = onFulfill.mock.calls[0][0] as { sessionId: string };
      expect(typeof fulfillArg.sessionId).toBe('string');
    });

    it('sets failed status when onFulfill returns success: false', async () => {
      const onFulfill = vi
        .fn()
        .mockResolvedValue({ success: false, message: 'Not found' });
      const callbacks: CioCheckoutCallbacks = { onFulfill };
      const props: CioCheckoutProps = {
        session: factories.checkoutSessionResponse.build(),
      };
      const { result } = renderHook(() => useCheckoutSession(props, callbacks));

      act(() => {
        result.current.openCheckout();
      });

      await waitFor(() => {
        expect(result.current.isOpen).toBe(true);
      });

      act(() => {
        result.current.handleComplete();
      });

      await waitFor(() => {
        expect(result.current.fulfillmentStatus).toBe('failed');
      });

      expect(result.current.fulfillmentResult).toEqual({
        success: false,
        message: 'Not found',
      });
    });

    it('sets failed status when onFulfill throws', async () => {
      const onFulfill = vi.fn().mockRejectedValue(new Error('Network error'));
      const callbacks: CioCheckoutCallbacks = { onFulfill };
      const props: CioCheckoutProps = {
        session: factories.checkoutSessionResponse.build(),
      };
      const { result } = renderHook(() => useCheckoutSession(props, callbacks));

      act(() => {
        result.current.openCheckout();
      });

      await waitFor(() => {
        expect(result.current.isOpen).toBe(true);
      });

      act(() => {
        result.current.handleComplete();
      });

      await waitFor(() => {
        expect(result.current.fulfillmentStatus).toBe('failed');
      });

      expect(result.current.fulfillmentResult).toEqual({
        success: false,
        message: 'Network error',
      });
    });

    it('handles non-Error thrown from onFulfill', async () => {
      const onFulfill = vi.fn().mockRejectedValue('string failure');
      const callbacks: CioCheckoutCallbacks = { onFulfill };
      const props: CioCheckoutProps = {
        session: factories.checkoutSessionResponse.build(),
      };
      const { result } = renderHook(() => useCheckoutSession(props, callbacks));

      act(() => {
        result.current.openCheckout();
      });

      await waitFor(() => {
        expect(result.current.isOpen).toBe(true);
      });

      act(() => {
        result.current.handleComplete();
      });

      await waitFor(() => {
        expect(result.current.fulfillmentStatus).toBe('failed');
      });

      expect(result.current.fulfillmentResult).toEqual({
        success: false,
        message: 'Fulfillment failed',
      });
    });

    it('calls onFulfillComplete after successful fulfillment', async () => {
      const fulfillResult = { success: true, message: 'Done' };
      const onFulfill = vi.fn().mockResolvedValue(fulfillResult);
      const onFulfillComplete = vi.fn();
      const callbacks: CioCheckoutCallbacks = {
        onFulfill,
        onFulfillComplete,
      };
      const props: CioCheckoutProps = {
        session: {
          clientSecret: 'cs_test_abc123_secret_xyz789',
          publishableKey: DEMO_PUBLISHABLE_KEY,
        },
      };
      const { result } = renderHook(() => useCheckoutSession(props, callbacks));

      act(() => {
        result.current.openCheckout();
      });

      await waitFor(() => {
        expect(result.current.isOpen).toBe(true);
      });

      act(() => {
        result.current.handleComplete();
      });

      await waitFor(() => {
        expect(onFulfillComplete).toHaveBeenCalledWith({
          sessionId: 'cs_test_abc123',
          items: undefined,
          result: fulfillResult,
        });
      });
    });

    it('calls onFulfillComplete after failed fulfillment', async () => {
      const onFulfill = vi.fn().mockRejectedValue(new Error('Server error'));
      const onFulfillComplete = vi.fn();
      const callbacks: CioCheckoutCallbacks = {
        onFulfill,
        onFulfillComplete,
      };
      const props: CioCheckoutProps = {
        session: factories.checkoutSessionResponse.build(),
      };
      const { result } = renderHook(() => useCheckoutSession(props, callbacks));

      act(() => {
        result.current.openCheckout();
      });

      await waitFor(() => {
        expect(result.current.isOpen).toBe(true);
      });

      act(() => {
        result.current.handleComplete();
      });

      await waitFor(() => {
        expect(onFulfillComplete).toHaveBeenCalledWith(
          expect.objectContaining({
            result: { success: false, message: 'Server error' },
          })
        );
      });
    });

    it('retries fulfillment using the same session event', async () => {
      let callCount = 0;
      const onFulfill = vi.fn().mockImplementation(() => {
        callCount += 1;
        if (callCount === 1) {
          return Promise.resolve({ success: false, message: 'Try again' });
        }
        return Promise.resolve({ success: true, message: 'OK' });
      });
      const callbacks: CioCheckoutCallbacks = { onFulfill };
      const props: CioCheckoutProps = {
        session: factories.checkoutSessionResponse.build(),
      };
      const { result } = renderHook(() => useCheckoutSession(props, callbacks));

      act(() => {
        result.current.openCheckout();
      });

      await waitFor(() => {
        expect(result.current.isOpen).toBe(true);
      });

      act(() => {
        result.current.handleComplete();
      });

      await waitFor(() => {
        expect(result.current.fulfillmentStatus).toBe('failed');
      });

      // Retry
      act(() => {
        result.current.retryFulfillment();
      });

      expect(result.current.fulfillmentStatus).toBe('pending');

      await waitFor(() => {
        expect(result.current.fulfillmentStatus).toBe('fulfilled');
      });

      expect(onFulfill).toHaveBeenCalledTimes(2);
      expect(result.current.fulfillmentResult).toEqual({
        success: true,
        message: 'OK',
      });
    });

    it('does not retry when no onFulfill callback is provided', async () => {
      const callbacks: CioCheckoutCallbacks = {};
      const props: CioCheckoutProps = {
        session: factories.checkoutSessionResponse.build(),
      };
      const { result } = renderHook(() => useCheckoutSession(props, callbacks));

      act(() => {
        result.current.openCheckout();
      });

      await waitFor(() => {
        expect(result.current.isOpen).toBe(true);
      });

      act(() => {
        result.current.handleComplete();
      });

      // No fulfillment was triggered
      expect(result.current.fulfillmentStatus).toBe('idle');

      // retryFulfillment should be a no-op
      act(() => {
        result.current.retryFulfillment();
      });

      expect(result.current.fulfillmentStatus).toBe('idle');
    });

    it('cleans up session state when no onFulfill is provided', async () => {
      const onComplete = vi.fn();
      const callbacks: CioCheckoutCallbacks = { onComplete };
      const props: CioCheckoutProps = {
        session: factories.checkoutSessionResponse.build(),
      };
      const { result } = renderHook(() => useCheckoutSession(props, callbacks));

      act(() => {
        result.current.openCheckout();
      });

      await waitFor(() => {
        expect(result.current.isOpen).toBe(true);
      });

      act(() => {
        result.current.handleComplete();
      });

      expect(result.current.isOpen).toBe(false);
      expect(result.current.session).toBeNull();
      expect(result.current.fulfillmentStatus).toBe('idle');
    });

    it('resets fulfillment state on reset', async () => {
      const onFulfill = vi
        .fn()
        .mockResolvedValue({ success: true, message: 'Done' });
      const callbacks: CioCheckoutCallbacks = { onFulfill };
      const props: CioCheckoutProps = {
        session: factories.checkoutSessionResponse.build(),
      };
      const { result } = renderHook(() => useCheckoutSession(props, callbacks));

      act(() => {
        result.current.openCheckout();
      });

      await waitFor(() => {
        expect(result.current.isOpen).toBe(true);
      });

      act(() => {
        result.current.handleComplete();
      });

      await waitFor(() => {
        expect(result.current.fulfillmentStatus).toBe('fulfilled');
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.fulfillmentStatus).toBe('idle');
      expect(result.current.fulfillmentResult).toBeNull();
    });
  });
});
