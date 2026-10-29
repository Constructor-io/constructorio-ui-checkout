import { useCallback, useEffect, useRef, useState } from 'react';

import {
  Button,
  RenderPropsWrapper,
} from '@constructor-io/constructorio-ui-components';

import CheckoutLoader from '@src/app/components/CheckoutLoader';
import CheckoutRoot from '@src/app/components/CheckoutRoot';
import { useCioCheckout } from '@src/app/hooks/useCioCheckout';
import { useCioCheckoutSession } from '@src/app/hooks/useCioCheckoutSession';
import { toError } from '@src/core/flow/helpers';
import type {
  CheckoutComponentOverrides,
  FiservPaymentFields,
  FiservSubmitResult,
  PayButtonRenderProps,
  Translations,
} from '@src/types';
import { loadScript, t } from '@src/utils';

import './CioFiservPaymentStep.css';

export const FISERV_SDK_URL =
  'https://commercehub-checkout.fiservapps.com/sdk/4.0.24/checkout.js';
const FISERV_SDK_SCRIPT_ID = 'cio-fiserv-checkout-sdk';

/** Ids of the four divs the SDK mounts its iframes into. Fixed, so mount one step per page. */
export const FISERV_FIELD_IDS = {
  cardNumber: 'cio-fiserv-cardNumber',
  nameOnCard: 'cio-fiserv-nameOnCard',
  expiration: 'cio-fiserv-expiration',
  securityCode: 'cio-fiserv-securityCode',
} as const;

const DEFAULT_FIELD_CSS = {
  input: {
    'font-family': 'inherit',
    'font-size': '16px',
    color: '#1f2937',
  },
};

// Same order as the sales-demos browser check. The server's approvalStatus check decides if the charge went through.
export function isCaptured(result: FiservSubmitResult): boolean {
  if (typeof result.isSuccessful === 'boolean') return result.isSuccessful;
  return result.gatewayResponse?.transactionState === 'CAPTURED';
}

export interface CioFiservPaymentStepProps {
  /** Formatted total for the pay button, for example `$49.99`. The step does not know the cart total. */
  amount?: string;
  /** Origins allowed to frame the hosted fields, passed to the SDK as `additionalFrameAncestors`. */
  frameAncestors?: string[];
  onCardBrandChange?: (brand: string | null) => void;
  onError?: (error: Error) => void;
  translations?: Translations;
  componentOverrides?: CheckoutComponentOverrides;
}

type FieldsStatus = 'loading' | 'ready' | 'error';

function CioFiservPaymentStepInner({
  amount,
  frameAncestors,
  onCardBrandChange,
  onError,
  translations,
  componentOverrides,
}: CioFiservPaymentStepProps) {
  const flow = useCioCheckout<'fiserv'>();
  const receivedProvider: string = flow.provider;
  if (receivedProvider !== 'fiserv') {
    throw new Error(
      `<CioFiservPaymentStep> must be rendered inside <CioCheckoutProvider provider="fiserv">, received provider="${receivedProvider}".`
    );
  }
  const { session, sessionStatus, missingSession, retry } =
    useCioCheckoutSession<'fiserv'>();

  const fieldsRef = useRef<FiservPaymentFields | null>(null);
  // useCioCheckout returns a new object per render; the mount effect must not restart on it.
  const flowRef = useRef(flow);
  flowRef.current = flow;
  const missingReportedRef = useRef(false);
  const onCardBrandChangeRef = useRef(onCardBrandChange);
  onCardBrandChangeRef.current = onCardBrandChange;
  const frameAncestorsRef = useRef(frameAncestors);
  frameAncestorsRef.current = frameAncestors;

  const [fieldsStatus, setFieldsStatus] = useState<FieldsStatus>('loading');
  const [isFormValid, setIsFormValid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    return flow.on((event) => {
      if (event.type !== 'error') return;
      if (
        event.source === 'session.create' ||
        event.source === 'payment.confirm'
      ) {
        onError?.(event.error);
      }
    });
  }, [flow, onError]);

  useEffect(() => {
    if (!missingSession || missingReportedRef.current) return;
    missingReportedRef.current = true;
    flow.emitError(
      'session.create',
      new Error(
        '<CioFiservPaymentStep> needs a session, but the flow has no onCreateSession handler.'
      )
    );
  }, [flow, missingSession]);

  // Mount the hosted fields once per session. Fiserv spends a session on its
  // first submit, so a new session always remounts the fields.
  useEffect(() => {
    if (!session) return;
    let active = true;
    setFieldsStatus('loading');
    setIsFormValid(false);
    setSubmitError(null);

    void (async () => {
      try {
        await loadScript({
          id: FISERV_SDK_SCRIPT_ID,
          src: FISERV_SDK_URL,
          isReady: () => Boolean(window.fiserv),
        });
        if (!active) return;
        const sdk = window.fiserv;
        if (!sdk)
          throw new Error('Fiserv SDK loaded but window.fiserv is undefined');

        await sdk.init({
          environment: session.environment.toUpperCase(),
          accessToken: session.accessToken,
          apiKey: session.apiKey,
          merchantId: session.merchantId,
          terminalId: session.terminalId,
          publicKey: session.publicKey,
          keyId: session.keyId,
          additionalFrameAncestors: frameAncestorsRef.current ?? [],
        });
        if (!active) return;

        const fields = await sdk.components.paymentFields({
          data: {
            paymentMethod: 'CREDIT_CARD',
            fields: {
              cardNumber: {
                parentElementId: FISERV_FIELD_IDS.cardNumber,
                masking: { mode: 'ALWAYS_MASK_EXCEPT_TRAILING' },
              },
              nameOnCard: { parentElementId: FISERV_FIELD_IDS.nameOnCard },
              expiration: { parentElementId: FISERV_FIELD_IDS.expiration },
              securityCode: {
                parentElementId: FISERV_FIELD_IDS.securityCode,
                masking: { mode: 'ALWAYS_MASK_ALL' },
              },
            },
            contextualCssClassNames: { valid: 'valid', invalid: 'invalid' },
            css: DEFAULT_FIELD_CSS,
          },
          hooks: {
            onFormValid: () => setIsFormValid(true),
            onFormNoLongerValid: () => setIsFormValid(false),
            onCardBrandChange: (brand: unknown) =>
              onCardBrandChangeRef.current?.(
                typeof brand === 'string' ? brand : null
              ),
          },
        });
        if (!active) {
          fields.destroyFields?.();
          return;
        }
        fieldsRef.current = fields;
        setFieldsStatus('ready');
      } catch (reason) {
        if (!active) return;
        setFieldsStatus('error');
        flowRef.current.emitError('session.create', toError(reason));
      }
    })();

    return () => {
      active = false;
      // Without this the SDK's iframes outlive the unmount and a remount
      // adds a second set into the same divs.
      fieldsRef.current?.destroyFields?.();
      fieldsRef.current = null;
    };
  }, [session]);

  const handleSubmit = useCallback(async () => {
    const fields = fieldsRef.current;
    if (!fields || isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);
    flow.setPaymentInProgress(true);
    try {
      const result = await fields.submit();
      if (!isCaptured(result)) {
        throw new Error(
          t(translations, 'CioCheckout.fiserv.captureFailedLabel')
        );
      }
      flow.setPaymentInProgress(false);
      void flow.next();
    } catch (reason) {
      flow.setPaymentInProgress(false);
      const error = toError(reason);
      setSubmitError(error.message);
      flow.emitError('payment.confirm', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [flow, isSubmitting, translations]);

  const handleRetrySession = useCallback(() => {
    void retry();
  }, [retry]);

  if (missingSession) {
    return (
      <div className="cio-checkout-session-error" role="alert">
        <p>This payment step needs an onCreateSession handler.</p>
      </div>
    );
  }

  if (sessionStatus === 'error' || fieldsStatus === 'error') {
    return (
      <div className="cio-checkout-session-error" role="alert">
        <p>{t(translations, 'CioCheckout.session.errorLabel')}</p>
        <button type="button" onClick={handleRetrySession}>
          {t(translations, 'CioCheckout.session.retryLabel')}
        </button>
      </div>
    );
  }

  const isReady = Boolean(session) && fieldsStatus === 'ready';
  const isDisabled = !isReady || !isFormValid || isSubmitting;
  const onClick = () => {
    void handleSubmit();
  };
  const payLabel = t(translations, 'CioCheckout.checkout.payButtonLabel');
  const loadingLabel = t(
    translations,
    'CioCheckout.checkout.payButtonLoadingLabel'
  );
  const buttonLabel = isSubmitting
    ? loadingLabel
    : amount
      ? `${payLabel} ${amount}`
      : payLabel;
  const payButtonProps: PayButtonRenderProps = {
    isSubmitting,
    isDisabled,
    amount: amount ?? '',
    onClick,
  };

  // The four divs stay mounted while loading so the SDK can find them.
  return (
    <div className="cio-checkout-form cio-checkout-fiserv">
      {!isReady && (
        <CheckoutLoader
          translations={translations}
          componentOverrides={componentOverrides}
        />
      )}
      <div
        className="cio-checkout-fiserv-fields"
        hidden={!isReady}
        aria-hidden={!isReady}
      >
        <label className="cio-checkout-fiserv-field">
          <span>{t(translations, 'CioCheckout.fiserv.cardNumberLabel')}</span>
          <div id={FISERV_FIELD_IDS.cardNumber} />
        </label>
        <label className="cio-checkout-fiserv-field">
          <span>{t(translations, 'CioCheckout.fiserv.nameOnCardLabel')}</span>
          <div id={FISERV_FIELD_IDS.nameOnCard} />
        </label>
        <div className="cio-checkout-fiserv-row">
          <label className="cio-checkout-fiserv-field">
            <span>{t(translations, 'CioCheckout.fiserv.expirationLabel')}</span>
            <div id={FISERV_FIELD_IDS.expiration} />
          </label>
          <label className="cio-checkout-fiserv-field">
            <span>
              {t(translations, 'CioCheckout.fiserv.securityCodeLabel')}
            </span>
            <div id={FISERV_FIELD_IDS.securityCode} />
          </label>
        </div>
      </div>
      {submitError && (
        <div className="cio-checkout-confirm-error" role="alert">
          {submitError}
        </div>
      )}
      {isReady && (
        <RenderPropsWrapper
          props={payButtonProps}
          override={componentOverrides?.payButton?.reactNode}
        >
          <Button
            className="cio-checkout-pay-button"
            onClick={onClick}
            disabled={isDisabled}
            aria-label={buttonLabel}
          >
            {buttonLabel}
          </Button>
        </RenderPropsWrapper>
      )}
    </div>
  );
}

export function CioFiservPaymentStep(props: CioFiservPaymentStepProps) {
  return (
    <CheckoutRoot>
      <CioFiservPaymentStepInner {...props} />
    </CheckoutRoot>
  );
}

export default CioFiservPaymentStep;
