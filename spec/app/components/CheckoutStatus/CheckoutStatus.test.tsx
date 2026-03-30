import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import CheckoutStatus from '@src/app/components/CheckoutStatus';
import type { FulfillmentResult, FulfillmentStatus } from '@src/types';

describe(`${CheckoutStatus.name}: client`, () => {
  const defaultProps = {
    onRetry: vi.fn(),
    onDismiss: vi.fn(),
  };

  function renderStatus(
    status: FulfillmentStatus,
    result: FulfillmentResult | null = null
  ) {
    return render(
      <CheckoutStatus
        fulfillmentStatus={status}
        fulfillmentResult={result}
        {...defaultProps}
      />
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when status is idle', () => {
    const { container } = renderStatus('idle');
    expect(container.firstChild).toBeNull();
  });

  it('renders a spinner and message when status is pending', () => {
    renderStatus('pending');
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Verifying your order...')).toBeInTheDocument();
  });

  it('renders success state with title when fulfilled', () => {
    renderStatus('fulfilled', { success: true });
    expect(screen.getByText('Order Confirmed')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('renders fulfillment message when fulfilled with message', () => {
    renderStatus('fulfilled', { success: true, message: 'Order #1234' });
    expect(screen.getByText('Order #1234')).toBeInTheDocument();
  });

  it('does not render message paragraph when fulfilled without message', () => {
    renderStatus('fulfilled', { success: true });
    expect(screen.queryByText('Order #1234')).not.toBeInTheDocument();
  });

  it('calls onDismiss when Done button is clicked in fulfilled state', async () => {
    const user = userEvent.setup();
    renderStatus('fulfilled', { success: true });
    await user.click(screen.getByText('Done'));
    expect(defaultProps.onDismiss).toHaveBeenCalledTimes(1);
  });

  it('renders failure state with title', () => {
    renderStatus('failed', { success: false });
    expect(screen.getByText('Verification Failed')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Your payment was processed. Please contact support if the issue persists.'
      )
    ).toBeInTheDocument();
  });

  it('renders failure message when provided', () => {
    renderStatus('failed', { success: false, message: 'Server timeout' });
    expect(screen.getByText('Server timeout')).toBeInTheDocument();
  });

  it('calls onRetry when Retry button is clicked', async () => {
    const user = userEvent.setup();
    renderStatus('failed', { success: false });
    await user.click(screen.getByText('Retry'));
    expect(defaultProps.onRetry).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss when Dismiss button is clicked in failed state', async () => {
    const user = userEvent.setup();
    renderStatus('failed', { success: false });
    await user.click(screen.getAllByText('Done')[0]);
    expect(defaultProps.onDismiss).toHaveBeenCalledTimes(1);
  });
});
