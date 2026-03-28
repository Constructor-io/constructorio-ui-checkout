import { useCallback, useEffect, useRef } from 'react';

import CheckoutForm from './CheckoutForm';

interface CheckoutOverlayProps {
  isOpen: boolean;
  clientSecret: string;
  publishableKey: string;
  onComplete: () => void;
  onClose: () => void;
}

export default function CheckoutOverlay({
  isOpen,
  clientSecret,
  publishableKey,
  onComplete,
  onClose,
}: CheckoutOverlayProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDialogElement>) => {
      const dialog = dialogRef.current;
      if (dialog && e.target === dialog) {
        onClose();
      }
    },
    [onClose]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDialogElement>) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      className="cio-checkout-overlay"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      aria-label="Checkout">
      <div className="cio-checkout-overlay__content">
        <div className="cio-checkout-overlay__header">
          <h2 className="cio-checkout-overlay__title">Checkout</h2>
          <button
            type="button"
            className="cio-checkout-overlay__close"
            onClick={onClose}
            aria-label="Close checkout">
            &times;
          </button>
        </div>
        <div className="cio-checkout-overlay__body">
          <CheckoutForm
            clientSecret={clientSecret}
            publishableKey={publishableKey}
            onComplete={onComplete}
          />
        </div>
      </div>
    </dialog>
  );
}
