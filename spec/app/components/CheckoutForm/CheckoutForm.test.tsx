import { render, screen } from '@testing-library/react';

import CheckoutForm from '@src/app/components/CheckoutForm';

describe('CheckoutForm', () => {
  it('renders the Stripe embedded checkout', () => {
    render(<CheckoutForm />);
    expect(screen.getByTestId('stripe-embedded-checkout')).toBeInTheDocument();
  });

  it('renders with the correct container class', () => {
    const { container } = render(<CheckoutForm />);
    // eslint-disable-next-line testing-library/no-node-access, testing-library/no-container
    expect(container.querySelector('.cio-checkout-form')).toBeInTheDocument();
  });
});
