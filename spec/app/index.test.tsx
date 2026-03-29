import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import * as factories from '@spec/factory';

import CioCheckout from '@src/app';
import type { CioCheckoutProps } from '@src/types';

describe(`${CioCheckout.displayName}: client`, () => {
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
});
