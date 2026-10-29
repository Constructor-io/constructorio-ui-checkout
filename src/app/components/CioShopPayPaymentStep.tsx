import { useCallback, useEffect, useId, useRef, useState } from 'react';

import CheckoutLoader from '@src/app/components/CheckoutLoader';
import CheckoutRoot from '@src/app/components/CheckoutRoot';
import { useCioCheckout } from '@src/app/hooks/useCioCheckout';
import { toError } from '@src/core/flow/helpers';
import type {
  CheckoutComponentOverrides,
  ShopPayPaymentRequest,
  ShopPayReceiptStatus,
  ShopPaySdkSession,
  ShopPaySessionResponse,
  Translations,
} from '@src/types';
import { loadScript, t } from '@src/utils';

export const SHOP_PAY_SDK_URL =
  'https://cdn.shopify.com/shopifycloud/shop-js/shop-pay-payment-request.js';
const SHOP_PAY_SDK_SCRIPT_ID = 'cio-shop-pay-sdk';

export const RECEIPT_POLL_INTERVAL_MS = 2000;
/** 15 checks 2 seconds apart: the step waits about 30 seconds for Shopify. */
export const RECEIPT_POLL_ATTEMPTS = 15;

/** Checks the receipt until it leaves `processing` or the attempts run out. */
export async function waitForReceipt(
  checkReceipt: (receiptToken: string) => Promise<ShopPayReceiptStatus>,
  receiptToken: string,
  attempts = RECEIPT_POLL_ATTEMPTS,
  intervalMs = RECEIPT_POLL_INTERVAL_MS
): Promise<ShopPayReceiptStatus> {
  for (let attempt = 1; ; attempt += 1) {
    const status = await checkReceipt(receiptToken);
    if (status.state !== 'processing' || attempt >= attempts) return status;
    await new Promise((resolve) => {
      setTimeout(resolve, intervalMs);
    });
  }
}

// Shopify allows one active session per page, but a page can show more than one step (a chat bar and
// an Added to Cart window). The newest step holds the session, and the one before it takes it back on unmount.
const sessionOwners: { pause: () => void; resume: () => void }[] = [];

export interface CioShopPayPaymentStepProps {
  /** The Shop channel's shop id. Public: the browser SDK sends it to Shopify. */
  shopId: number | string;
  /** The Shop channel's client id. Public. */
  clientId: string;
  /** What the popup shows. The server prices the submit again, so this never sets the charge. */
  paymentRequest: ShopPayPaymentRequest;
  /** Calls the server's Storefront session create. Must reply within 15 seconds. */
  onSessionRequest: (
    paymentRequest: ShopPayPaymentRequest
  ) => Promise<ShopPaySessionResponse>;
  /** Calls the server's Storefront submit and resolves with the receipt token. Throw to show an error in the popup. */
  onSubmitPayment: (args: {
    token: string;
    paymentMethod?: string;
  }) => Promise<string>;
  /** Calls the server's Admin API receipt lookup. */
  onCheckReceipt: (receiptToken: string) => Promise<ShopPayReceiptStatus>;
  onError?: (error: Error) => void;
  translations?: Translations;
  componentOverrides?: CheckoutComponentOverrides;
}

type StepStatus = 'loading' | 'ready' | 'confirming' | 'pending' | 'error';

function CioShopPayPaymentStepInner({
  shopId,
  clientId,
  paymentRequest,
  onSessionRequest,
  onSubmitPayment,
  onCheckReceipt,
  onError,
  translations,
  componentOverrides,
}: CioShopPayPaymentStepProps) {
  const flow = useCioCheckout<'shop-pay'>();
  const receivedProvider: string = flow.provider;
  if (receivedProvider !== 'shop-pay') {
    throw new Error(
      `<CioShopPayPaymentStep> must be rendered inside <CioCheckoutProvider provider="shop-pay">, received provider="${receivedProvider}".`
    );
  }

  const containerId = `cio-shop-pay-button-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`;
  // useCioCheckout returns a new object per render; the SDK effect must not restart on it.
  const flowRef = useRef(flow);
  flowRef.current = flow;
  const latestProps = {
    paymentRequest,
    onSessionRequest,
    onSubmitPayment,
    onCheckReceipt,
    translations,
  };
  const propsRef = useRef(latestProps);
  propsRef.current = latestProps;
  // paymentcomplete and a later windowclosed can both hand over the same receipt.
  const confirmedTokenRef = useRef<string | null>(null);
  const restartIdleRef = useRef<(() => void) | null>(null);

  const [status, setStatus] = useState<StepStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);

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

  const fail = useCallback((reason: unknown) => {
    const failure = toError(reason);
    flowRef.current.setPaymentInProgress(false);
    setError(failure.message);
    setStatus('ready');
    flowRef.current.emitError('payment.confirm', failure);
  }, []);

  // Shopify creates the order after the popup, so the step advances only on a `completed` receipt.
  const confirm = useCallback(
    async (receiptToken: string) => {
      if (confirmedTokenRef.current === receiptToken) return;
      confirmedTokenRef.current = receiptToken;
      setError(null);
      setStatus('confirming');
      try {
        const receipt = await waitForReceipt(
          propsRef.current.onCheckReceipt,
          receiptToken
        );
        if (receipt.state === 'completed') {
          flowRef.current.setPaymentInProgress(false);
          void flowRef.current.next();
        } else if (receipt.state === 'processing') {
          // Offering the button again could charge the shopper twice.
          setStatus('pending');
        } else {
          fail(
            new Error(
              receipt.message ??
                t(
                  propsRef.current.translations,
                  'CioCheckout.shopPay.failedLabel'
                )
            )
          );
        }
      } catch (reason) {
        fail(reason);
      }
    },
    [fail]
  );

  useEffect(() => {
    let active = true;
    let session: ShopPaySdkSession | null = null;
    // The session must stay while the popup is open. Its close starts a new one.
    let popupOpen = false;
    let ownsSession = false;
    setStatus('loading');

    function startSession() {
      const sdk = window.ShopPay;
      if (!active || !sdk || !ownsSession) return;
      popupOpen = false;
      const request = sdk.PaymentRequest.build(propsRef.current.paymentRequest);
      const sdkSession = sdk.PaymentRequest.createSession({
        paymentRequest: request,
      });
      session = sdkSession;
      let sessionToken: string | null = null;
      let receiptToken: string | null = null;
      let closed = false;

      const restart = () => {
        closed = true;
        sdkSession.close();
        startSession();
      };

      // paymentcomplete and windowclosed both end the popup.
      const handleClose = () => {
        const token = receiptToken;
        restart();
        if (token) void confirm(token);
      };

      // Each handler calls exactly one complete method, within 15 seconds.
      sdkSession.addEventListener('sessionrequested', async () => {
        popupOpen = true;
        if (active) setError(null);
        try {
          const response = await propsRef.current.onSessionRequest(request);
          sessionToken = response.token;
          sdkSession.completeSessionRequest({
            ...response,
            updatedPaymentRequest: request,
          });
        } catch (reason) {
          // completeSessionRequest takes no errors, so the only safe reply is to close the popup.
          const failure = toError(reason);
          if (active) setError(failure.message);
          flowRef.current.emitError('session.create', failure);
          restart();
        }
      });

      sdkSession.addEventListener('shippingaddresschanged', () => {
        sdkSession.completeShippingAddressChange({
          updatedPaymentRequest: request,
        });
      });

      sdkSession.addEventListener('deliverymethodchanged', () => {
        sdkSession.completeDeliveryMethodChange({
          updatedPaymentRequest: request,
        });
      });

      sdkSession.addEventListener('paymentconfirmationrequested', async () => {
        const reject = (message: string) =>
          sdkSession.completePaymentConfirmationRequest({
            errors: [{ type: 'generalError', message }],
          });
        if (!sessionToken) {
          reject(
            t(propsRef.current.translations, 'CioCheckout.shopPay.failedLabel')
          );
          return;
        }
        flowRef.current.setPaymentInProgress(true);
        try {
          const paymentMethod = sdkSession.paymentRequest?.paymentMethod;
          receiptToken = await propsRef.current.onSubmitPayment({
            token: sessionToken,
            ...(paymentMethod ? { paymentMethod } : {}),
          });
          // The shopper closed the popup while the submit ran: the charge may still have gone through.
          if (closed) {
            void confirm(receiptToken);
            return;
          }
          sdkSession.completePaymentConfirmationRequest();
        } catch (reason) {
          flowRef.current.setPaymentInProgress(false);
          if (!closed) reject(toError(reason).message);
        }
      });

      sdkSession.addEventListener('paymentcomplete', handleClose);
      sdkSession.addEventListener('windowclosed', handleClose);
    }

    const owner = {
      pause: () => {
        ownsSession = false;
        session?.close();
        session = null;
      },
      resume: () => {
        ownsSession = true;
        startSession();
      },
    };

    void (async () => {
      try {
        await loadScript({
          id: SHOP_PAY_SDK_SCRIPT_ID,
          src: SHOP_PAY_SDK_URL,
          isReady: () => Boolean(window.ShopPay),
        });
        const sdk = window.ShopPay;
        if (!active) return;
        if (!sdk)
          throw new Error(
            'Shop Pay SDK loaded but window.ShopPay is undefined'
          );
        sdk.PaymentRequest.configure({
          shopId,
          clientId,
          discountCodeField: false,
        });
        sessionOwners.at(-1)?.pause();
        sessionOwners.push(owner);
        owner.resume();
        restartIdleRef.current = () => {
          if (popupOpen) return;
          session?.close();
          startSession();
        };
        sdk.PaymentRequest.createButton().render(`#${containerId}`);
        setStatus('ready');
      } catch (reason) {
        if (!active) return;
        setStatus('error');
        flowRef.current.emitError('session.create', toError(reason));
      }
    })();

    return () => {
      active = false;
      restartIdleRef.current = null;
      session?.close();
      const index = sessionOwners.indexOf(owner);
      if (index === -1) return;
      sessionOwners.splice(index, 1);
      if (index === sessionOwners.length) sessionOwners.at(-1)?.resume();
    };
  }, [containerId, shopId, clientId, confirm, loadAttempt]);

  // A session keeps the request it started with, so a new request needs a new session.
  const requestKey = JSON.stringify(paymentRequest);
  const sessionRequestKeyRef = useRef(requestKey);
  useEffect(() => {
    if (sessionRequestKeyRef.current === requestKey) return;
    sessionRequestKeyRef.current = requestKey;
    restartIdleRef.current?.();
  }, [requestKey]);

  if (status === 'error') {
    return (
      <div className="cio-checkout-session-error" role="alert">
        <p>{t(translations, 'CioCheckout.session.errorLabel')}</p>
        <button type="button" onClick={() => setLoadAttempt((n) => n + 1)}>
          {t(translations, 'CioCheckout.session.retryLabel')}
        </button>
      </div>
    );
  }

  // The button div stays mounted so the SDK's button survives a confirm.
  return (
    <div className="cio-checkout-form cio-checkout-shop-pay">
      {status === 'loading' && (
        <CheckoutLoader
          translations={translations}
          componentOverrides={componentOverrides}
        />
      )}
      <div id={containerId} hidden={status !== 'ready'} />
      {status === 'confirming' && (
        <div className="cio-checkout-shop-pay-status" role="status">
          {t(translations, 'CioCheckout.shopPay.confirmingLabel')}
        </div>
      )}
      {status === 'pending' && (
        <div className="cio-checkout-shop-pay-status" role="status">
          {t(translations, 'CioCheckout.shopPay.pendingLabel')}
        </div>
      )}
      {error && (
        <div className="cio-checkout-confirm-error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}

/** Shop Pay Wallet. Several steps on one page take turns holding Shopify's one session. */
export function CioShopPayPaymentStep(props: CioShopPayPaymentStepProps) {
  return (
    <CheckoutRoot>
      <CioShopPayPaymentStepInner {...props} />
    </CheckoutRoot>
  );
}

export default CioShopPayPaymentStep;
