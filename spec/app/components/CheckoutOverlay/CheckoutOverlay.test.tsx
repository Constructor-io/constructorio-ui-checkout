import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import CheckoutOverlay from '@src/app/components/CheckoutOverlay';

describe(`${CheckoutOverlay.name}: client`, () => {
  const onClose = vi.fn();

  it('returns null when not open', () => {
    render(<CheckoutOverlay isOpen={false} onClose={onClose} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the dialog when open', () => {
    render(<CheckoutOverlay isOpen onClose={onClose} />);
    expect(
      screen.getByRole('dialog', { name: 'Checkout' })
    ).toBeInTheDocument();
  });

  it('renders a title and close button', () => {
    render(<CheckoutOverlay isOpen onClose={onClose} />);
    expect(screen.getByText('Checkout')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Close checkout' })
    ).toBeInTheDocument();
  });

  it('renders the Stripe embedded checkout', () => {
    render(<CheckoutOverlay isOpen onClose={onClose} />);
    expect(screen.getByTestId('stripe-embedded-checkout')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    render(<CheckoutOverlay isOpen onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'Close checkout' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('opens the dialog via showModal', () => {
    render(<CheckoutOverlay isOpen onClose={onClose} />);
    const dialog = screen.getByRole('dialog', { name: 'Checkout' });
    expect(dialog).toHaveAttribute('open');
  });

  it('calls onClose when Escape key is pressed', () => {
    render(<CheckoutOverlay isOpen onClose={onClose} />);

    const dialog = screen.getByRole('dialog', { name: 'Checkout' });
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose for non-Escape keys', () => {
    render(<CheckoutOverlay isOpen onClose={onClose} />);

    const dialog = screen.getByRole('dialog', { name: 'Checkout' });
    fireEvent.keyDown(dialog, { key: 'Enter' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose when clicking the backdrop (dialog element itself)', () => {
    render(<CheckoutOverlay isOpen onClose={onClose} />);

    const dialog = screen.getByRole('dialog', { name: 'Checkout' });
    fireEvent.click(dialog, { target: dialog });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when clicking inside the dialog content', () => {
    render(<CheckoutOverlay isOpen onClose={onClose} />);

    const content = screen.getByText('Checkout');
    fireEvent.click(content);
    expect(onClose).not.toHaveBeenCalled();
  });
});
