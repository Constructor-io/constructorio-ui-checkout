interface CheckoutTriggerProps {
  onClick: () => void;
  isLoading: boolean;
  label?: string;
  children?: React.ReactNode;
}

export default function CheckoutTrigger({
  onClick,
  isLoading,
  label = 'Checkout',
  children,
}: CheckoutTriggerProps) {
  if (children) {
    return (
      <button
        type="button"
        className="cio-checkout-trigger cio-checkout-trigger--custom"
        onClick={onClick}
        disabled={isLoading}
        aria-label={label}>
        {children}
      </button>
    );
  }

  return (
    <button
      type="button"
      className="cio-checkout-trigger"
      onClick={onClick}
      disabled={isLoading}>
      {isLoading ? (
        <span className="cio-checkout-trigger__spinner" aria-hidden="true" />
      ) : null}
      {isLoading ? 'Loading...' : label}
    </button>
  );
}
