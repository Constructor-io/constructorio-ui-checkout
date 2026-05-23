import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import CheckoutInline from '@src/app/components/CheckoutInline';

describe(`${CheckoutInline.name}: client`, () => {
  const onCancel = vi.fn();
  const onComplete = vi.fn();

  it('renders with title and cancel button', () => {
    render(<CheckoutInline onCancel={onCancel} onComplete={onComplete} />);
    expect(screen.getByText('Checkout')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('renders the Stripe payment element in elements mode', () => {
    render(<CheckoutInline onCancel={onCancel} onComplete={onComplete} />);
    expect(screen.getByTestId('stripe-payment-element')).toBeInTheDocument();
  });

  it('renders the Stripe checkout form in form mode', () => {
    render(
      <CheckoutInline
        onCancel={onCancel}
        onComplete={onComplete}
        uiMode="form"
      />
    );
    expect(screen.getByTestId('stripe-checkout-form')).toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<CheckoutInline onCancel={onCancel} onComplete={onComplete} />);

    await user.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
