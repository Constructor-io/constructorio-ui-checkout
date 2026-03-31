import { useCallback, useEffect, useRef } from 'react';

import { Button } from '@constructor-io/constructorio-ui-components';

import type { Translations } from '@src/types';
import { t } from '@src/utils';

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
  translations?: Translations;
}

export default function CheckoutOverlay({
  isOpen,
  onClose,
  translations,
}: CheckoutOverlayProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }

    return () => {
      if (dialog.open) {
        dialog.close();
      }
    };
  }, [isOpen]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDialogElement>) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  const handleCancel = useCallback(
    (e: React.SyntheticEvent<HTMLDialogElement>) => {
      e.preventDefault();
      onClose();
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
      onCancel={handleCancel}
      aria-label={t(translations, 'CioCheckout.checkout.title')}
    >
      <div className="cio-checkout-overlay-content">
        <div className="cio-checkout-overlay-header">
          <h2 className="cio-checkout-overlay-title">
            {t(translations, 'CioCheckout.checkout.title')}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label={t(translations, 'CioCheckout.checkout.closeLabel')}
          >
            <CloseIcon />
          </Button>
        </div>
        <div className="cio-checkout-overlay-body">
          <CheckoutForm />
        </div>
      </div>
    </dialog>
  );
}

