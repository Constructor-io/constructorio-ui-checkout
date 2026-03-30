import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import CheckoutInline from '@src/app/components/CheckoutInline';

describe(`${CheckoutInline.name}: client`, () => {
  const onCancel = vi.fn();

  it('renders with title and cancel button', () => {
    render(<CheckoutInline onCancel={onCancel} />);
    expect(screen.getByText('Checkout')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('renders the Stripe embedded checkout', () => {
    render(<CheckoutInline onCancel={onCancel} />);
    expect(screen.getByTestId('stripe-embedded-checkout')).toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<CheckoutInline onCancel={onCancel} />);

    await user.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
