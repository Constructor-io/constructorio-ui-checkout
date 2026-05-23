import * as stripeCheckout from '@stripe/react-stripe-js/checkout';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import CheckoutForm from '@src/app/components/CheckoutForm';

describe(`${CheckoutForm.name}: client`, () => {
  const onComplete = vi.fn();
  const onError = vi.fn();
  const onSessionExpired = vi.fn();

  beforeEach(() => {
    vi.mocked(stripeCheckout.useCheckoutForm).mockReturnValue({
      type: 'success' as const,
      checkout: {
        status: { type: 'open' },
        confirm: vi.fn().mockResolvedValue({ type: 'success' }),
        session: () => ({ status: { type: 'open' } }),
      },
    });
  });

  it('renders the Stripe checkout form', () => {
    render(<CheckoutForm onComplete={onComplete} />);
    expect(screen.getByTestId('stripe-checkout-form')).toBeInTheDocument();
  });

  it('renders with the correct container class', () => {
    const { container } = render(<CheckoutForm onComplete={onComplete} />);
    expect(container.firstChild).toHaveClass('cio-checkout-form');
  });

  it('renders loading state', () => {
    vi.mocked(stripeCheckout.useCheckoutForm).mockReturnValue({
      type: 'loading' as const,
    });

    render(<CheckoutForm onComplete={onComplete} />);
    expect(
      screen.queryByTestId('stripe-checkout-form')
    ).not.toBeInTheDocument();
  });

  it('calls onSessionExpired when checkout state is error with expired message', () => {
    vi.mocked(stripeCheckout.useCheckoutForm).mockReturnValue({
      type: 'error' as const,
      error: { message: 'Session has expired' },
    });

    render(
      <CheckoutForm
        onComplete={onComplete}
        onSessionExpired={onSessionExpired}
      />
    );
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it('calls onError when checkout state is error with non-expired message', () => {
    vi.mocked(stripeCheckout.useCheckoutForm).mockReturnValue({
      type: 'error' as const,
      error: { message: 'Something went wrong' },
    });

    render(<CheckoutForm onComplete={onComplete} onError={onError} />);
    expect(onError).toHaveBeenCalledWith(new Error('Something went wrong'));
  });

  it('returns null when checkout state is error', () => {
    vi.mocked(stripeCheckout.useCheckoutForm).mockReturnValue({
      type: 'error' as const,
      error: { message: 'Something went wrong' },
    });

    render(<CheckoutForm onComplete={onComplete} onError={onError} />);
    expect(
      screen.queryByTestId('stripe-checkout-form')
    ).not.toBeInTheDocument();
  });

  it('calls onSessionExpired when checkout status is expired', () => {
    vi.mocked(stripeCheckout.useCheckoutForm).mockReturnValue({
      type: 'success' as const,
      checkout: {
        status: { type: 'expired' },
        confirm: vi.fn(),
        session: () => ({ status: { type: 'expired' } }),
      },
    });

    render(
      <CheckoutForm
        onComplete={onComplete}
        onSessionExpired={onSessionExpired}
      />
    );
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it('returns null when checkout status is expired', () => {
    vi.mocked(stripeCheckout.useCheckoutForm).mockReturnValue({
      type: 'success' as const,
      checkout: {
        status: { type: 'expired' },
        confirm: vi.fn(),
        session: () => ({ status: { type: 'expired' } }),
      },
    });

    render(
      <CheckoutForm
        onComplete={onComplete}
        onSessionExpired={onSessionExpired}
      />
    );
    expect(
      screen.queryByTestId('stripe-checkout-form')
    ).not.toBeInTheDocument();
  });

  it('calls onComplete when confirm succeeds', async () => {
    const confirmMock = vi.fn().mockResolvedValue({ type: 'success' });
    vi.mocked(stripeCheckout.useCheckoutForm).mockReturnValue({
      type: 'success' as const,
      checkout: {
        status: { type: 'open' },
        confirm: confirmMock,
        session: () => ({ status: { type: 'open' } }),
      },
    });

    render(<CheckoutForm onComplete={onComplete} />);
    fireEvent.click(screen.getByTestId('stripe-checkout-form'));

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  it('calls onError when confirm returns an error', async () => {
    const confirmMock = vi.fn().mockResolvedValue({
      type: 'error',
      error: { message: 'Card declined' },
    });
    vi.mocked(stripeCheckout.useCheckoutForm).mockReturnValue({
      type: 'success' as const,
      checkout: {
        status: { type: 'open' },
        confirm: confirmMock,
        session: () => ({ status: { type: 'open' } }),
      },
    });

    render(<CheckoutForm onComplete={onComplete} onError={onError} />);
    fireEvent.click(screen.getByTestId('stripe-checkout-form'));

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(new Error('Card declined'));
    });
  });

  it('calls onError when confirm throws an Error', async () => {
    const confirmMock = vi.fn().mockRejectedValue(new Error('Network failure'));
    vi.mocked(stripeCheckout.useCheckoutForm).mockReturnValue({
      type: 'success' as const,
      checkout: {
        status: { type: 'open' },
        confirm: confirmMock,
        session: () => ({ status: { type: 'open' } }),
      },
    });

    render(<CheckoutForm onComplete={onComplete} onError={onError} />);
    fireEvent.click(screen.getByTestId('stripe-checkout-form'));

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(new Error('Network failure'));
    });
  });

  it('calls onError wrapping non-Error throws', async () => {
    const confirmMock = vi.fn().mockRejectedValue('string error');
    vi.mocked(stripeCheckout.useCheckoutForm).mockReturnValue({
      type: 'success' as const,
      checkout: {
        status: { type: 'open' },
        confirm: confirmMock,
        session: () => ({ status: { type: 'open' } }),
      },
    });

    render(<CheckoutForm onComplete={onComplete} onError={onError} />);
    fireEvent.click(screen.getByTestId('stripe-checkout-form'));

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(new Error('string error'));
    });
  });
});
