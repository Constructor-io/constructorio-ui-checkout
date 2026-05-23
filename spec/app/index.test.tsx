import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import * as factories from '@spec/factory';

import CioCheckout from '@src/app';
import type { CioCheckoutProps, FulfillmentResult } from '@src/types';

let capturedProviderOptions: Record<string, unknown> | undefined;
let mockConfirm: ReturnType<typeof vi.fn>;

vi.mock('@stripe/react-stripe-js/checkout', () => ({
  CheckoutForm: ({ onConfirm }: { onConfirm?: (event: unknown) => void }) => (
    <div data-testid="stripe-checkout-form">
      <button
        data-testid="stripe-pay-button"
        onClick={() => onConfirm?.({ type: 'payButton' })}
      >
        Pay
      </button>
    </div>
  ),
  PaymentElement: () => (
    <div data-testid="stripe-payment-element">Payment Element</div>
  ),
  CheckoutFormProvider: ({
    children,
    options,
  }: {
    children: React.ReactNode;
    options?: Record<string, unknown>;
  }) => {
    capturedProviderOptions = options;
    return <div data-testid="stripe-provider">{children}</div>;
  },
  CheckoutElementsProvider: ({
    children,
    options,
  }: {
    children: React.ReactNode;
    options?: Record<string, unknown>;
  }) => {
    capturedProviderOptions = options;
    return <div data-testid="stripe-provider">{children}</div>;
  },
  useCheckoutForm: () => ({
    type: 'success' as const,
    checkout: {
      status: { type: 'open' },
      confirm: mockConfirm,
    },
  }),
  useCheckoutElements: () => ({
    type: 'success' as const,
    checkout: {
      status: { type: 'open' },
      confirm: mockConfirm,
      total: { total: { minorUnitsAmount: 4999, amount: '$49.99' } },
    },
  }),
}));

describe(`${CioCheckout.displayName}: client`, () => {
  beforeEach(() => {
    capturedProviderOptions = undefined;
    mockConfirm = vi.fn().mockResolvedValue({ type: 'success' });
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
    expect(screen.getByTestId('stripe-payment-element')).toBeInTheDocument();
  });

  it('opens inline checkout on trigger click', async () => {
    const user = userEvent.setup();
    const props = factories.checkoutProps.build();
    render(<CioCheckout {...props} displayMode="inline" />);

    await user.click(screen.getByRole('button', { name: 'Checkout' }));

    await waitFor(() => {
      expect(screen.getByTestId('stripe-payment-element')).toBeInTheDocument();
    });
    expect(screen.getByText('Cancel')).toBeInTheDocument();
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
    const ref = {
      current: null as {
        open: () => void;
        close: () => void;
        reset: () => void;
      } | null,
    };
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

  it('passes clientSecret to CheckoutFormProvider', async () => {
    const user = userEvent.setup();
    const props = factories.checkoutProps.build();

    render(<CioCheckout {...props} />);
    await user.click(screen.getByRole('button', { name: 'Checkout' }));

    await waitFor(() => {
      expect(screen.getByTestId('stripe-provider')).toBeInTheDocument();
    });

    expect(capturedProviderOptions?.clientSecret).toBeTypeOf('string');
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
        uiMode: 'form',
        callbacks: { onFulfill, ...extraCallbacks },
      };

      render(<CioCheckout {...props} />);
      await user.click(screen.getByRole('button', { name: 'Checkout' }));

      await waitFor(() => {
        expect(screen.getByTestId('stripe-checkout-form')).toBeInTheDocument();
      });

      // Simulate payment via the mocked Pay button which triggers onConfirm
      await user.click(screen.getByTestId('stripe-pay-button'));

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

      await waitFor(() => {
        expect(screen.getByText('Verifying your order...')).toBeInTheDocument();
      });

      expect(
        screen.queryByRole('button', { name: 'Checkout' })
      ).not.toBeInTheDocument();

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

      act(() => {
        resolveFn({ success: false, message: 'Server busy' });
      });

      await waitFor(() => {
        expect(screen.getByText('Verification Failed')).toBeInTheDocument();
      });
      expect(screen.getByText('Server busy')).toBeInTheDocument();

      await user.click(screen.getByText('Retry'));

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

      const doneButton = screen.getByRole('button', { name: 'Done' });
      await user.click(doneButton);

      await waitFor(() => {
        expect(screen.queryByText('Order Confirmed')).not.toBeInTheDocument();
      });
      expect(
        screen.getByRole('button', { name: 'Checkout' })
      ).toBeInTheDocument();
    });
  });
});
