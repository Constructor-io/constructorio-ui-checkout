import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import CheckoutTrigger from '@src/app/components/CheckoutTrigger';

describe('CheckoutTrigger', () => {
  it('renders the default trigger button with label', () => {
    render(<CheckoutTrigger onClick={vi.fn()} isLoading={false} />);
    expect(screen.getByText('Checkout')).toBeInTheDocument();
  });

  it('renders a custom label', () => {
    render(
      <CheckoutTrigger onClick={vi.fn()} isLoading={false} label="Buy Now" />
    );
    expect(screen.getByText('Buy Now')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<CheckoutTrigger onClick={vi.fn()} isLoading />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<CheckoutTrigger onClick={onClick} isLoading={false} />);

    await user.click(screen.getByText('Checkout'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('disables button when loading', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<CheckoutTrigger onClick={onClick} isLoading />);

    await user.click(screen.getByText('Loading...'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('renders a custom React element as trigger', () => {
    const onClick = vi.fn();
    render(
      <CheckoutTrigger onClick={onClick} isLoading={false}>
        <span>Custom Element</span>
      </CheckoutTrigger>
    );
    expect(screen.getByText('Custom Element')).toBeInTheDocument();
  });

  it('clones onClick and disabled onto a valid React element child', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <CheckoutTrigger onClick={onClick} isLoading={false}>
        <button type="button">Custom Button</button>
      </CheckoutTrigger>
    );

    await user.click(screen.getByText('Custom Button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('sets disabled on cloned element when loading', () => {
    render(
      <CheckoutTrigger onClick={vi.fn()} isLoading>
        <button type="button">Custom Button</button>
      </CheckoutTrigger>
    );

    expect(screen.getByText('Custom Button')).toBeDisabled();
  });

  it('wraps non-element children in a plain button', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <CheckoutTrigger onClick={onClick} isLoading={false}>
        Some text content
      </CheckoutTrigger>
    );

    const btn = screen.getByRole('button', { name: 'Checkout' });
    expect(btn).toHaveClass('cio-checkout-trigger-custom');
    await user.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
