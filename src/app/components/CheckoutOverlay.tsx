import { useCallback, useEffect, useRef } from 'react';

import { Button } from '@constructor-io/constructorio-ui-components';

import CheckoutForm from './CheckoutForm';

function CloseIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M15.8334 5.34166L14.6584 4.16666L10.0001 8.82499L5.34175 4.16666L4.16675 5.34166L8.82508 9.99999L4.16675 14.6583L5.34175 15.8333L10.0001 11.175L14.6584 15.8333L15.8334 14.6583L11.1751 9.99999L15.8334 5.34166Z"
        fill="currentColor"
      />
    </svg>
  );
}

interface CheckoutOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CheckoutOverlay({
  isOpen,
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

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDialogElement>) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;

    const handleClick = (e: MouseEvent) => {
      if (e.target === dialog) {
        onClose();
      }
    };

    dialog.addEventListener('click', handleClick);
    return () => dialog.removeEventListener('click', handleClick);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      className="cio-checkout-overlay"
      onKeyDown={handleKeyDown}
      aria-label="Checkout"
    >
      <div className="cio-checkout-overlay__content">
        <div className="cio-checkout-overlay__header">
          <h2 className="cio-checkout-overlay__title">Checkout</h2>
          <Button
            variant="ghost"
            size="icon"
            className="cio-checkout-overlay__close"
            onClick={onClose}
            aria-label="Close checkout"
          >
            <CloseIcon />
          </Button>
        </div>
        <div className="cio-checkout-overlay__body">
          <CheckoutForm />
        </div>
      </div>
    </dialog>
  );
}
