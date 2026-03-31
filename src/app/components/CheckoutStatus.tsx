import type { ComponentOverrideProps } from '@constructor-io/constructorio-ui-components';
import {
  Button,
  RenderPropsWrapper,
} from '@constructor-io/constructorio-ui-components';

import type {
  CheckoutStatusRenderProps,
  FulfillmentResult,
  FulfillmentStatus,
  Translations,
} from '@src/types';
import { t } from '@src/utils';

function CheckIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="24" fill="#dcfce7" />
      <path
        d="M14 24.5L21 31.5L34 18.5"
        stroke="#16a34a"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="24" fill="#fef2f2" />
      <path
        d="M17 17L31 31M31 17L17 31"
        stroke="#dc2626"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

interface CheckoutStatusProps {
  fulfillmentStatus: FulfillmentStatus;
  fulfillmentResult: FulfillmentResult | null;
  onRetry: () => void;
  onDismiss: () => void;
  translations?: Translations;
  componentOverride?: ComponentOverrideProps<CheckoutStatusRenderProps>;
}

export default function CheckoutStatus({
  fulfillmentStatus,
  fulfillmentResult,
  onRetry,
  onDismiss,
  translations,
  componentOverride,
}: CheckoutStatusProps) {
  if (fulfillmentStatus === 'idle') return null;

  const renderProps: CheckoutStatusRenderProps = {
    fulfillmentStatus,
    fulfillmentResult,
    onRetry,
    onDismiss,
    translations,
  };

  return (
    <RenderPropsWrapper
      props={renderProps}
      override={componentOverride?.reactNode}
    >
      <div className="cio-checkout-status" role="status">
        {fulfillmentStatus === 'pending' && (
          <div className="cio-checkout-status-pending">
            <span className="cio-checkout-status-spinner" aria-hidden="true" />
            <p className="cio-checkout-status-message">
              {t(translations, 'CioCheckout.fulfillment.pending')}
            </p>
          </div>
        )}

        {fulfillmentStatus === 'fulfilled' && (
          <div className="cio-checkout-status-fulfilled">
            <CheckIcon />
            <h3 className="cio-checkout-status-title">
              {t(translations, 'CioCheckout.fulfillment.success')}
            </h3>
            {fulfillmentResult?.message && (
              <p className="cio-checkout-status-message">
                {fulfillmentResult.message}
              </p>
            )}
            <Button className="cio-checkout-status-dismiss" onClick={onDismiss}>
              {t(translations, 'CioCheckout.fulfillment.dismissLabel')}
            </Button>
          </div>
        )}

        {fulfillmentStatus === 'failed' && (
          <div className="cio-checkout-status-failed">
            <ErrorIcon />
            <h3 className="cio-checkout-status-title">
              {t(translations, 'CioCheckout.fulfillment.failure')}
            </h3>
            {fulfillmentResult?.message && (
              <p className="cio-checkout-status-message">
                {fulfillmentResult.message}
              </p>
            )}
            <p className="cio-checkout-status-hint">
              {t(translations, 'CioCheckout.fulfillment.failureHint')}
            </p>
            <div className="cio-checkout-status-actions">
              <Button onClick={onRetry}>
                {t(translations, 'CioCheckout.fulfillment.retryLabel')}
              </Button>
              <Button
                variant="outline"
                className="cio-checkout-status-dismiss"
                onClick={onDismiss}
              >
                {t(translations, 'CioCheckout.fulfillment.dismissLabel')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </RenderPropsWrapper>
  );
}
