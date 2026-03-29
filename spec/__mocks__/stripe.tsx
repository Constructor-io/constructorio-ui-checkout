vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn().mockResolvedValue({ elements: vi.fn() }),
}));

vi.mock('@stripe/react-stripe-js', () => ({
  EmbeddedCheckout: () => (
    <div data-testid="stripe-embedded-checkout">Stripe Checkout</div>
  ),
  EmbeddedCheckoutProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="stripe-provider">{children}</div>
  ),
}));
