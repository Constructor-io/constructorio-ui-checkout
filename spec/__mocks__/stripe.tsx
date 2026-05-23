vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn().mockResolvedValue({ elements: vi.fn() }),
}));

vi.mock('@stripe/react-stripe-js/checkout', () => ({
  CheckoutForm: ({ onConfirm }: { onConfirm?: (event: unknown) => void }) => (
    <div data-testid="stripe-checkout-form" data-on-confirm={!!onConfirm}>
      Stripe Checkout Form
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
    (globalThis as Record<string, unknown>).__capturedProviderOptions__ =
      options;
    return <div data-testid="stripe-provider">{children}</div>;
  },
  CheckoutElementsProvider: ({
    children,
    options,
  }: {
    children: React.ReactNode;
    options?: Record<string, unknown>;
  }) => {
    (globalThis as Record<string, unknown>).__capturedProviderOptions__ =
      options;
    return <div data-testid="stripe-provider">{children}</div>;
  },
  useCheckoutForm: () => ({
    type: 'success' as const,
    checkout: {
      status: { type: 'open' },
      confirm: vi.fn().mockResolvedValue({ type: 'success' }),
      session: () => ({ status: { type: 'open' } }),
    },
  }),
  useCheckoutElements: () => ({
    type: 'success' as const,
    checkout: {
      status: { type: 'open' },
      confirm: vi.fn().mockResolvedValue({ type: 'success' }),
        total: { total: 4999 },
    },
  }),
}));
