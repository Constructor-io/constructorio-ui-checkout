import { render, screen } from '@testing-library/react';

import CheckoutForm from '@src/app/components/CheckoutForm';

describe(`${CheckoutForm.name}: client`, () => {
  it('renders the Stripe checkout form', () => {
    render(<CheckoutForm onComplete={vi.fn()} />);
    expect(screen.getByTestId('stripe-checkout-form')).toBeInTheDocument();
  });

  it('renders with the correct container class', () => {
    const { container } = render(<CheckoutForm onComplete={vi.fn()} />);
    // eslint-disable-next-line testing-library/no-node-access, testing-library/no-container
    expect(container.querySelector('.cio-checkout-form')).toBeInTheDocument();
  });
});
