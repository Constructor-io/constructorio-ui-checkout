import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import CheckoutFormElements from '@src/app/components/CheckoutFormElements';

import * as stripeCheckout from '@stripe/react-stripe-js/checkout';

describe(`${CheckoutFormElements.name}: client`, () => {
  const onComplete = vi.fn();
  const onError = vi.fn();
  const onSessionExpired = vi.fn();

  beforeEach(() => {
    vi.mocked(stripeCheckout.useCheckoutElements).mockReturnValue({
      type: 'success' as const,
      checkout: {
        status: { type: 'open' },
        confirm: vi.fn().mockResolvedValue({ type: 'success' }),
        total: { total: { amount: '$49.99' } },
        currencyOptions: [],
      },
    } as unknown as ReturnType<typeof stripeCheckout.useCheckoutElements>);
  });

  it('renders the payment element', () => {
    render(<CheckoutFormElements onComplete={onComplete} />);
    expect(screen.getByTestId('stripe-payment-element')).toBeInTheDocument();
  });

  it('renders with the correct container class', () => {
    const { container } = render(
      <CheckoutFormElements onComplete={onComplete} />
    );
    // eslint-disable-next-line testing-library/no-node-access, testing-library/no-container
    expect(container.querySelector('.cio-checkout-form')).toBeInTheDocument();
  });

  it('renders the pay button with amount', () => {
    render(<CheckoutFormElements onComplete={onComplete} />);
    expect(screen.getByRole('button')).toHaveTextContent('Pay $49.99');
  });

  it('disables the pay button initially (payment not complete)', () => {
    render(<CheckoutFormElements onComplete={onComplete} />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('enables the pay button after payment element reports complete', () => {
    render(<CheckoutFormElements onComplete={onComplete} />);
    fireEvent.click(screen.getByTestId('stripe-payment-element'));
    expect(screen.getByRole('button')).toBeEnabled();
  });

  it('calls onComplete on successful confirm', async () => {
    const confirmMock = vi.fn().mockResolvedValue({ type: 'success' });
    vi.mocked(stripeCheckout.useCheckoutElements).mockReturnValue({
      type: 'success' as const,
      checkout: {
        status: { type: 'open' },
        confirm: confirmMock,
        total: { total: { amount: '$49.99' } },
        currencyOptions: [],
      },
    } as unknown as ReturnType<typeof stripeCheckout.useCheckoutElements>);

    render(<CheckoutFormElements onComplete={onComplete} />);
    fireEvent.click(screen.getByTestId('stripe-payment-element'));
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  it('calls onError when confirm returns an error', async () => {
    const confirmMock = vi.fn().mockResolvedValue({
      type: 'error',
      error: { message: 'Card declined' },
    });
    vi.mocked(stripeCheckout.useCheckoutElements).mockReturnValue({
      type: 'success' as const,
      checkout: {
        status: { type: 'open' },
        confirm: confirmMock,
        total: { total: { amount: '$49.99' } },
        currencyOptions: [],
      },
    } as unknown as ReturnType<typeof stripeCheckout.useCheckoutElements>);

    render(
      <CheckoutFormElements onComplete={onComplete} onError={onError} />
    );
    fireEvent.click(screen.getByTestId('stripe-payment-element'));
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(new Error('Card declined'));
    });
  });

  it('calls onError when confirm throws an Error', async () => {
    const confirmMock = vi.fn().mockRejectedValue(new Error('Network failure'));
    vi.mocked(stripeCheckout.useCheckoutElements).mockReturnValue({
      type: 'success' as const,
      checkout: {
        status: { type: 'open' },
        confirm: confirmMock,
        total: { total: { amount: '$49.99' } },
        currencyOptions: [],
      },
    } as unknown as ReturnType<typeof stripeCheckout.useCheckoutElements>);

    render(
      <CheckoutFormElements onComplete={onComplete} onError={onError} />
    );
    fireEvent.click(screen.getByTestId('stripe-payment-element'));
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(new Error('Network failure'));
    });
  });

  it('calls onError wrapping non-Error throws', async () => {
    const confirmMock = vi.fn().mockRejectedValue('string error');
    vi.mocked(stripeCheckout.useCheckoutElements).mockReturnValue({
      type: 'success' as const,
      checkout: {
        status: { type: 'open' },
        confirm: confirmMock,
        total: { total: { amount: '$49.99' } },
        currencyOptions: [],
      },
    } as unknown as ReturnType<typeof stripeCheckout.useCheckoutElements>);

    render(
      <CheckoutFormElements onComplete={onComplete} onError={onError} />
    );
    fireEvent.click(screen.getByTestId('stripe-payment-element'));
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(new Error('string error'));
    });
  });

  it('calls onSessionExpired when checkout state is error with expired message', () => {
    vi.mocked(stripeCheckout.useCheckoutElements).mockReturnValue({
      type: 'error' as const,
      error: { message: 'Session has expired' },
    } as unknown as ReturnType<typeof stripeCheckout.useCheckoutElements>);

    render(
      <CheckoutFormElements
        onComplete={onComplete}
        onSessionExpired={onSessionExpired}
      />
    );
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it('calls onError when checkout state is error with non-expired message', () => {
    vi.mocked(stripeCheckout.useCheckoutElements).mockReturnValue({
      type: 'error' as const,
      error: { message: 'Something went wrong' },
    } as unknown as ReturnType<typeof stripeCheckout.useCheckoutElements>);

    render(
      <CheckoutFormElements onComplete={onComplete} onError={onError} />
    );
    expect(onError).toHaveBeenCalledWith(new Error('Something went wrong'));
  });

  it('returns null when checkout state is error', () => {
    vi.mocked(stripeCheckout.useCheckoutElements).mockReturnValue({
      type: 'error' as const,
      error: { message: 'Something went wrong' },
    } as unknown as ReturnType<typeof stripeCheckout.useCheckoutElements>);

    const { container } = render(
      <CheckoutFormElements onComplete={onComplete} onError={onError} />
    );
    // eslint-disable-next-line testing-library/no-node-access, testing-library/no-container
    expect(container.querySelector('.cio-checkout-form')).not.toBeInTheDocument();
  });

  it('calls onSessionExpired when checkout status is expired', () => {
    vi.mocked(stripeCheckout.useCheckoutElements).mockReturnValue({
      type: 'success' as const,
      checkout: {
        status: { type: 'expired' },
        confirm: vi.fn(),
        total: { total: { amount: '$49.99' } },
        currencyOptions: [],
      },
    } as unknown as ReturnType<typeof stripeCheckout.useCheckoutElements>);

    render(
      <CheckoutFormElements
        onComplete={onComplete}
        onSessionExpired={onSessionExpired}
      />
    );
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it('disables the pay button during loading state', () => {
    vi.mocked(stripeCheckout.useCheckoutElements).mockReturnValue({
      type: 'loading' as const,
    } as unknown as ReturnType<typeof stripeCheckout.useCheckoutElements>);

    render(<CheckoutFormElements onComplete={onComplete} />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('shows "Processing..." label while submitting', async () => {
    let resolveConfirm!: (value: unknown) => void;
    const confirmMock = vi.fn(
      () => new Promise((resolve) => { resolveConfirm = resolve; })
    );
    vi.mocked(stripeCheckout.useCheckoutElements).mockReturnValue({
      type: 'success' as const,
      checkout: {
        status: { type: 'open' },
        confirm: confirmMock,
        total: { total: { amount: '$49.99' } },
        currencyOptions: [],
      },
    } as unknown as ReturnType<typeof stripeCheckout.useCheckoutElements>);

    render(<CheckoutFormElements onComplete={onComplete} />);
    fireEvent.click(screen.getByTestId('stripe-payment-element'));
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByRole('button')).toHaveTextContent('Processing...');
    });

    resolveConfirm({ type: 'success' });
    await waitFor(() => {
      expect(screen.getByRole('button')).toHaveTextContent('Pay $49.99');
    });
  });

  it('renders currency selector when multiple currency options exist', () => {
    vi.mocked(stripeCheckout.useCheckoutElements).mockReturnValue({
      type: 'success' as const,
      checkout: {
        status: { type: 'open' },
        confirm: vi.fn().mockResolvedValue({ type: 'success' }),
        total: { total: { amount: '$49.99' } },
        currencyOptions: ['usd', 'eur'],
      },
    } as unknown as ReturnType<typeof stripeCheckout.useCheckoutElements>);

    render(<CheckoutFormElements onComplete={onComplete} />);
    expect(screen.getByTestId('stripe-currency-selector')).toBeInTheDocument();
  });

  it('does not render currency selector when only one option', () => {
    render(<CheckoutFormElements onComplete={onComplete} />);
    expect(
      screen.queryByTestId('stripe-currency-selector')
    ).not.toBeInTheDocument();
  });

  it('supports custom translations for button labels', () => {
    render(
      <CheckoutFormElements
        onComplete={onComplete}
        translations={{ 'CioCheckout.checkout.payButtonLabel': 'Purchase' }}
      />
    );
    expect(screen.getByRole('button')).toHaveTextContent('Purchase $49.99');
  });
});
