import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import * as factories from '@spec/factory';

import CioCheckout from '@src/app';
import type { CioCheckoutProps, FulfillmentResult } from '@src/types';

// Capture options passed to EmbeddedCheckoutProvider so we can simulate
// Stripe calling onComplete and verify callback passthrough.
let capturedOnComplete: (() => void) | undefined;
let capturedOptions: Record<string, unknown> | undefined;

vi.mock('@stripe/react-stripe-js', () => ({
  EmbeddedCheckout: () => (
    <div data-testid="stripe-embedded-checkout">Stripe Checkout</div>
  ),
  EmbeddedCheckoutProvider: ({
    children,
    options,
  }: {
    children: React.ReactNode;
    options?: Record<string, unknown>;
  }) => {
    capturedOnComplete = options?.onComplete as (() => void) | undefined;
    capturedOptions = options;
    return <div data-testid="stripe-provider">{children}</div>;
  },
}));

describe(`${CioCheckout.displayName}: client`, () => {
  beforeEach(() => {
    capturedOnComplete = undefined;
    capturedOptions = undefined;
  });

  it('renders the trigger button', () => {
    const props = factories.checkoutProps.build();
    render(<CioCheckout {...props} />);
    expect(
      screen.getByRole('button', { name: 'Checkout' })
    ).toBeInTheDocument();
  });

  it('renders with a custom trigger label', () => {
    const props = factories.checkoutProps.build();
    render(<CioCheckout {...props} triggerLabel="Buy Now" />);
    expect(screen.getByRole('button', { name: 'Buy Now' })).toBeInTheDocument();
  });

  it('renders a custom trigger element', () => {
    const props = factories.checkoutProps.build();
    render(<CioCheckout {...props} trigger={<span>Custom Trigger</span>} />);
    expect(screen.getByText('Custom Trigger')).toBeInTheDocument();
  });

  it('opens modal checkout on trigger click', async () => {
    const user = userEvent.setup();
    const props = factories.checkoutProps.build();
    render(<CioCheckout {...props} />);

    await user.click(screen.getByRole('button', { name: 'Checkout' }));

    await waitFor(() => {
      expect(
        screen.getByRole('dialog', { name: 'Checkout' })
      ).toBeInTheDocument();
    });
    expect(screen.getByTestId('stripe-embedded-checkout')).toBeInTheDocument();
  });

  it('opens inline checkout on trigger click', async () => {
    const user = userEvent.setup();
    const props = factories.checkoutProps.build();
    render(<CioCheckout {...props} displayMode="inline" />);

    await user.click(screen.getByRole('button', { name: 'Checkout' }));

    await waitFor(() => {
      expect(
        screen.getByTestId('stripe-embedded-checkout')
      ).toBeInTheDocument();
    });
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    // Trigger should be hidden in inline mode when open
    expect(
      screen.queryByRole('button', { name: 'Checkout' })
    ).not.toBeInTheDocument();
  });

  it('hides trigger when triggerWhen returns false', () => {
    const props: CioCheckoutProps = {
      ...factories.checkoutProps.build(),
      triggerWhen: () => false,
    };
    render(<CioCheckout {...props} />);
    expect(
      screen.queryByRole('button', { name: 'Checkout' })
    ).not.toBeInTheDocument();
  });

  it('shows trigger when triggerWhen returns true', () => {
    const props: CioCheckoutProps = {
      ...factories.checkoutProps.build(),
      triggerWhen: () => true,
    };
    render(<CioCheckout {...props} />);
    expect(
      screen.getByRole('button', { name: 'Checkout' })
    ).toBeInTheDocument();
  });

  it('passes triggerState to triggerWhen', () => {
    const triggerWhen = vi.fn().mockReturnValue(true);
    const triggerState = { count: 5 };
    const props: CioCheckoutProps = {
      ...factories.checkoutProps.build(),
      triggerWhen,
      triggerState,
    };
    render(<CioCheckout {...props} />);
    expect(triggerWhen).toHaveBeenCalledWith(triggerState);
  });

  it('displays error message on session failure', async () => {
    const user = userEvent.setup();
    const sessionFn = vi.fn().mockRejectedValue(new Error('Network error'));
    const props: CioCheckoutProps = { session: sessionFn };

    render(<CioCheckout {...props} />);
    await user.click(screen.getByRole('button', { name: 'Checkout' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Network error');
    });
  });

  it('calls onError callback on session failure', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const error = new Error('Session error');
    const sessionFn = vi.fn().mockRejectedValue(error);
    const props: CioCheckoutProps = {
      session: sessionFn,
      callbacks: { onError },
    };

    render(<CioCheckout {...props} />);
    await user.click(screen.getByRole('button', { name: 'Checkout' }));

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(error);
    });
  });

  it('closes modal and calls onClose callback', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const props: CioCheckoutProps = {
      ...factories.checkoutProps.build(),
      callbacks: { onClose },
    };

    render(<CioCheckout {...props} />);
    await user.click(screen.getByRole('button', { name: 'Checkout' }));

    await waitFor(() => {
      expect(
        screen.getByRole('dialog', { name: 'Checkout' })
      ).toBeInTheDocument();
    });

    const dialog = screen.getByRole('dialog', { name: 'Checkout' });
    const closeBtn = within(dialog).getByRole('button', {
      name: 'Close checkout',
    });
    await user.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('exposes reset via ref', async () => {
    const user = userEvent.setup();
    const ref = { current: null as { reset: () => void } | null };
    const props = factories.checkoutProps.build();

    render(<CioCheckout ref={ref} {...props} />);
    await user.click(screen.getByRole('button', { name: 'Checkout' }));

    await waitFor(() => {
      expect(
        screen.getByRole('dialog', { name: 'Checkout' })
      ).toBeInTheDocument();
    });

    act(() => {
      ref.current?.reset();
    });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('forwards onShippingDetailsChange to EmbeddedCheckoutProvider', async () => {
    const user = userEvent.setup();
    const onShippingDetailsChange = vi.fn();
    const props: CioCheckoutProps = {
      ...factories.checkoutProps.build(),
      onShippingDetailsChange,
    };

    render(<CioCheckout {...props} />);
    await user.click(screen.getByRole('button', { name: 'Checkout' }));

    await waitFor(() => {
      expect(screen.getByTestId('stripe-provider')).toBeInTheDocument();
    });

    expect(capturedOptions?.onShippingDetailsChange).toBe(
      onShippingDetailsChange
    );
    expect(capturedOptions?.clientSecret).toBeTypeOf('string');
    expect(capturedOptions?.onComplete).toBeTypeOf('function');
  });

  it('forwards onLineItemsChange to EmbeddedCheckoutProvider', async () => {
    const user = userEvent.setup();
    const onLineItemsChange = vi.fn();
    const props: CioCheckoutProps = {
      ...factories.checkoutProps.build(),
      onLineItemsChange,
    };

    render(<CioCheckout {...props} />);
    await user.click(screen.getByRole('button', { name: 'Checkout' }));

    await waitFor(() => {
      expect(screen.getByTestId('stripe-provider')).toBeInTheDocument();
    });

    expect(capturedOptions?.onLineItemsChange).toBe(onLineItemsChange);
    expect(capturedOptions?.clientSecret).toBeTypeOf('string');
    expect(capturedOptions?.onComplete).toBeTypeOf('function');
  });

  // ---------------------------------------------------------------------------
  // Fulfillment integration
  // ---------------------------------------------------------------------------

  describe('fulfillment', () => {
    async function openAndComplete(
      onFulfill: (event: unknown) => Promise<FulfillmentResult>,
      extraCallbacks: Partial<CioCheckoutProps['callbacks']> = {}
    ) {
      const user = userEvent.setup();

      const props: CioCheckoutProps = {
        ...factories.checkoutProps.build(),
        callbacks: { onFulfill, ...extraCallbacks },
      };

      render(<CioCheckout {...props} />);
      await user.click(screen.getByRole('button', { name: 'Checkout' }));

      await waitFor(() => {
        expect(
          screen.getByTestId('stripe-embedded-checkout')
        ).toBeInTheDocument();
      });

      // Simulate Stripe payment completion via captured onComplete
      act(() => {
        capturedOnComplete?.();
      });

      return user;
    }

    it('shows pending status after payment completes with onFulfill', async () => {
      let resolveFulfill!: (result: FulfillmentResult) => void;
      const onFulfill = vi.fn().mockImplementation(
        () =>
          new Promise<FulfillmentResult>((resolve) => {
            resolveFulfill = resolve;
          })
      );

      await openAndComplete(onFulfill);

      // Should show pending state
      await waitFor(() => {
        expect(screen.getByText('Verifying your order...')).toBeInTheDocument();
      });

      // Trigger should be hidden while fulfilling
      expect(
        screen.queryByRole('button', { name: 'Checkout' })
      ).not.toBeInTheDocument();

      // Resolve fulfillment
      act(() => {
        resolveFulfill({ success: true, message: 'Order #5678' });
      });

      await waitFor(() => {
        expect(screen.getByText('Order Confirmed')).toBeInTheDocument();
      });
      expect(screen.getByText('Order #5678')).toBeInTheDocument();
    });

    it('shows failed status and allows retry', async () => {
      let callCount = 0;
      let resolveFn!: (result: FulfillmentResult) => void;
      const onFulfill = vi.fn().mockImplementation(
        () =>
          new Promise<FulfillmentResult>((resolve) => {
            callCount += 1;
            resolveFn = resolve;
          })
      );

      const user = await openAndComplete(onFulfill);

      // Resolve first call as failed
      act(() => {
        resolveFn({ success: false, message: 'Server busy' });
      });

      await waitFor(() => {
        expect(screen.getByText('Verification Failed')).toBeInTheDocument();
      });
      expect(screen.getByText('Server busy')).toBeInTheDocument();

      // Retry
      await user.click(screen.getByText('Retry'));

      // Resolve second call as success
      act(() => {
        resolveFn({ success: true, message: 'Order #9999' });
      });

      await waitFor(() => {
        expect(screen.getByText('Order Confirmed')).toBeInTheDocument();
      });
      expect(screen.getByText('Order #9999')).toBeInTheDocument();
      expect(callCount).toBe(2);
    });

    it('dismisses fulfillment status and shows trigger again', async () => {
      let resolveFn!: (result: FulfillmentResult) => void;
      const onFulfill = vi.fn().mockImplementation(
        () =>
          new Promise<FulfillmentResult>((resolve) => {
            resolveFn = resolve;
          })
      );

      const user = await openAndComplete(onFulfill);

      act(() => {
        resolveFn({ success: true, message: 'Order #5555' });
      });

      await waitFor(() => {
        expect(screen.getByText('Order Confirmed')).toBeInTheDocument();
      });

      // Click the Done button (not the message text)
      const doneButton = screen.getByRole('button', { name: 'Done' });
      await user.click(doneButton);

      await waitFor(() => {
        expect(screen.queryByText('Order Confirmed')).not.toBeInTheDocument();
      });
      // Trigger should be visible again
      expect(
        screen.getByRole('button', { name: 'Checkout' })
      ).toBeInTheDocument();
    });
  });
});
