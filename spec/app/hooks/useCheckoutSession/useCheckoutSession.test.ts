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
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
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
});
