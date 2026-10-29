import { act, render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { CioCheckoutStep } from '@src/app/components/CioCheckoutStep';
import {
  CioShopPayPaymentStep,
  type CioShopPayPaymentStepProps,
  waitForReceipt,
} from '@src/app/components/CioShopPayPaymentStep';
import { useCioCheckout } from '@src/app/hooks/useCioCheckout';
import { CioCheckoutProvider } from '@src/app/providers/CioCheckoutProvider';
import { PAYMENT_STEP } from '@src/core/types';
import type { ShopPayReceiptStatus, ShopPaySdkSession } from '@src/types';
import * as loadScriptModule from '@src/utils/loadScript';

import { shopPayPaymentRequest, shopPaySession } from '../../../factory';

type Listener = (event: unknown) => unknown;

type FakeSession = ShopPaySdkSession & {
  fire: (name: string) => Promise<void>;
  /** Starts a handler without waiting for it, for events that overlap. */
  start: (name: string) => void;
};

const paymentRequest = shopPayPaymentRequest.build();
const sessionResponse = shopPaySession.build();

function installFakeSdk() {
  const sessions: FakeSession[] = [];
  const configure = vi.fn();
  const render = vi.fn();
  const createSession = vi.fn(() => {
    const listeners = new Map<string, Listener>();
    const session: FakeSession = {
      paymentRequest: { paymentMethod: 'pm_1' },
      addEventListener: (name, listener) => listeners.set(name, listener),
      completeSessionRequest: vi.fn(),
      completeShippingAddressChange: vi.fn(),
      completeDeliveryMethodChange: vi.fn(),
      completePaymentConfirmationRequest: vi.fn(),
      close: vi.fn(),
      start: (name) => {
        act(() => void listeners.get(name)?.({}));
      },
      fire: async (name) => {
        await act(async () => {
          await listeners.get(name)?.({});
        });
      },
    };
    sessions.push(session);
    return session;
  });
  window.ShopPay = {
    PaymentRequest: {
      configure,
      build: (request) => request,
      createButton: () => ({ render }),
      createSession,
    },
  };
  return { configure, render, createSession, current: () => sessions.at(-1)! };
}

function defaultProps(
  overrides: Partial<CioShopPayPaymentStepProps> = {}
): CioShopPayPaymentStepProps {
  return {
    shopId: 123,
    clientId: 'client_1',
    paymentRequest,
    onSessionRequest: vi.fn(() => Promise.resolve(sessionResponse)),
    onSubmitPayment: vi.fn(() => Promise.resolve('receipt_1')),
    onCheckReceipt: vi.fn(() =>
      Promise.resolve<ShopPayReceiptStatus>({ state: 'completed' })
    ),
    ...overrides,
  };
}

function Harness({
  steps,
  inProgress,
  ...props
}: CioShopPayPaymentStepProps & { steps?: string[]; inProgress?: boolean[] }) {
  function Probe() {
    const { currentStepId, paymentInProgress } = useCioCheckout().state;
    steps?.push(String(currentStepId));
    inProgress?.push(paymentInProgress);
    return null;
  }
  return (
    <CioCheckoutProvider
      provider="shop-pay"
      steps={[{ id: PAYMENT_STEP }, { id: 'done' }]}
      autoStart
    >
      <Probe />
      <CioCheckoutStep id={PAYMENT_STEP}>
        <CioShopPayPaymentStep {...props} />
      </CioCheckoutStep>
    </CioCheckoutProvider>
  );
}

async function payThroughPopup(sdk: ReturnType<typeof installFakeSdk>) {
  await waitFor(() => expect(sdk.render).toHaveBeenCalled());
  const session = sdk.current();
  await session.fire('sessionrequested');
  await session.fire('paymentconfirmationrequested');
  await session.fire('paymentcomplete');
  return session;
}

describe(`${CioShopPayPaymentStep.name}: client`, () => {
  beforeEach(() => {
    vi.spyOn(loadScriptModule, 'loadScript').mockResolvedValue(undefined);
  });

  afterEach(() => {
    delete window.ShopPay;
  });

  it('throws outside provider="shop-pay"', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() =>
      render(
        <CioCheckoutProvider provider="fiserv" steps={[{ id: PAYMENT_STEP }]}>
          <CioShopPayPaymentStep {...defaultProps()} />
        </CioCheckoutProvider>
      )
    ).toThrow('provider="shop-pay"');
  });

  it('configures the SDK, renders the button and starts a session', async () => {
    const sdk = installFakeSdk();
    render(<Harness {...defaultProps()} />);
    await waitFor(() => expect(sdk.render).toHaveBeenCalled());
    expect(sdk.configure).toHaveBeenCalledWith({
      shopId: 123,
      clientId: 'client_1',
      discountCodeField: false,
    });
    expect(sdk.render).toHaveBeenCalledWith(
      expect.stringMatching(/^#cio-shop-pay-button-/)
    );
    expect(sdk.createSession).toHaveBeenCalledWith({ paymentRequest });
  });

  it('answers the session request with the server session', async () => {
    const sdk = installFakeSdk();
    const props = defaultProps();
    render(<Harness {...props} />);
    await waitFor(() => expect(sdk.render).toHaveBeenCalled());
    await sdk.current().fire('sessionrequested');
    expect(props.onSessionRequest).toHaveBeenCalledWith(paymentRequest);
    expect(sdk.current().completeSessionRequest).toHaveBeenCalledWith({
      ...sessionResponse,
      updatedPaymentRequest: paymentRequest,
    });
  });

  it('replies to address and delivery changes with the same request', async () => {
    const sdk = installFakeSdk();
    render(<Harness {...defaultProps()} />);
    await waitFor(() => expect(sdk.render).toHaveBeenCalled());
    const session = sdk.current();
    await session.fire('shippingaddresschanged');
    await session.fire('deliverymethodchanged');
    expect(session.completeShippingAddressChange).toHaveBeenCalledWith({
      updatedPaymentRequest: paymentRequest,
    });
    expect(session.completeDeliveryMethodChange).toHaveBeenCalledWith({
      updatedPaymentRequest: paymentRequest,
    });
  });

  it('closes the popup and reports a failed session request', async () => {
    const sdk = installFakeSdk();
    const onError = vi.fn<(error: Error) => void>();
    render(
      <Harness
        {...defaultProps({
          onSessionRequest: () => Promise.reject(new Error('store paused')),
          onError,
        })}
      />
    );
    await waitFor(() => expect(sdk.render).toHaveBeenCalled());
    const first = sdk.current();
    await first.fire('sessionrequested');
    expect(first.close).toHaveBeenCalled();
    expect(sdk.createSession).toHaveBeenCalledTimes(2);
    expect(await screen.findByText('store paused')).toBeInTheDocument();
    expect(onError.mock.calls[0][0].message).toBe('store paused');
  });

  it('submits with the session token and payment method', async () => {
    const sdk = installFakeSdk();
    const props = defaultProps();
    render(<Harness {...props} />);
    const session = await payThroughPopup(sdk);
    expect(props.onSubmitPayment).toHaveBeenCalledWith({
      token: sessionResponse.token,
      paymentMethod: 'pm_1',
    });
    expect(session.completePaymentConfirmationRequest).toHaveBeenCalledWith();
  });

  it('shows a rejected submit inside the popup', async () => {
    const sdk = installFakeSdk();
    render(
      <Harness
        {...defaultProps({
          onSubmitPayment: () => Promise.reject(new Error('Sold out')),
        })}
      />
    );
    await waitFor(() => expect(sdk.render).toHaveBeenCalled());
    const session = sdk.current();
    await session.fire('sessionrequested');
    await session.fire('paymentconfirmationrequested');
    expect(session.completePaymentConfirmationRequest).toHaveBeenCalledWith({
      errors: [{ type: 'generalError', message: 'Sold out' }],
    });
  });

  it('advances the flow once the receipt is completed', async () => {
    const sdk = installFakeSdk();
    const steps: string[] = [];
    const props = defaultProps();
    render(<Harness {...props} steps={steps} />);
    const session = await payThroughPopup(sdk);
    await session.fire('windowclosed');
    await waitFor(() => expect(steps.at(-1)).toBe('done'));
    // paymentcomplete and windowclosed hand over the same receipt once.
    expect(props.onCheckReceipt).toHaveBeenCalledTimes(1);
    expect(props.onCheckReceipt).toHaveBeenCalledWith('receipt_1');
  });

  it('shows the error and stays on the step when the receipt failed', async () => {
    const sdk = installFakeSdk();
    const steps: string[] = [];
    const onError = vi.fn<(error: Error) => void>();
    render(
      <Harness
        {...defaultProps({
          onCheckReceipt: () =>
            Promise.resolve({ state: 'failed', message: 'Card declined' }),
          onError,
        })}
        steps={steps}
      />
    );
    await payThroughPopup(sdk);
    expect(await screen.findByText('Card declined')).toBeInTheDocument();
    expect(onError.mock.calls[0][0].message).toBe('Card declined');
    expect(steps.at(-1)).toBe(PAYMENT_STEP);
  });

  it('clears an old error when the popup opens again', async () => {
    const sdk = installFakeSdk();
    const onSessionRequest = vi
      .fn<CioShopPayPaymentStepProps['onSessionRequest']>()
      .mockRejectedValueOnce(new Error('store paused'))
      .mockResolvedValue(sessionResponse);
    render(<Harness {...defaultProps({ onSessionRequest })} />);
    await waitFor(() => expect(sdk.render).toHaveBeenCalled());
    await sdk.current().fire('sessionrequested');
    expect(await screen.findByText('store paused')).toBeInTheDocument();
    await sdk.current().fire('sessionrequested');
    expect(screen.queryByText('store paused')).not.toBeInTheDocument();
  });

  it('confirms a submit that finishes after the popup closed', async () => {
    const sdk = installFakeSdk();
    const steps: string[] = [];
    let finishSubmit: (receiptToken: string) => void = () => undefined;
    const props = defaultProps({
      onSubmitPayment: () =>
        new Promise((resolve) => {
          finishSubmit = resolve;
        }),
    });
    render(<Harness {...props} steps={steps} />);
    await waitFor(() => expect(sdk.render).toHaveBeenCalled());
    const session = sdk.current();
    await session.fire('sessionrequested');
    session.start('paymentconfirmationrequested');
    await session.fire('windowclosed');
    act(() => finishSubmit('receipt_late'));
    await waitFor(() => expect(steps.at(-1)).toBe('done'));
    expect(props.onCheckReceipt).toHaveBeenCalledWith('receipt_late');
    expect(session.completePaymentConfirmationRequest).not.toHaveBeenCalled();
  });

  it('clears paymentInProgress when a submit fails after the popup closed', async () => {
    const sdk = installFakeSdk();
    const inProgress: boolean[] = [];
    let failSubmit: (reason: Error) => void = () => undefined;
    render(
      <Harness
        {...defaultProps({
          onSubmitPayment: () =>
            new Promise((_, reject) => {
              failSubmit = reject;
            }),
        })}
        inProgress={inProgress}
      />
    );
    await waitFor(() => expect(sdk.render).toHaveBeenCalled());
    const session = sdk.current();
    await session.fire('sessionrequested');
    session.start('paymentconfirmationrequested');
    expect(inProgress.at(-1)).toBe(true);
    await session.fire('windowclosed');
    act(() => failSubmit(new Error('declined')));
    await waitFor(() => expect(inProgress.at(-1)).toBe(false));
    expect(session.completePaymentConfirmationRequest).not.toHaveBeenCalled();
  });

  it('starts a new session when the payment request changes', async () => {
    const sdk = installFakeSdk();
    const props = defaultProps();
    const { rerender } = render(<Harness {...props} />);
    await waitFor(() => expect(sdk.render).toHaveBeenCalled());
    const first = sdk.current();
    const updated = shopPayPaymentRequest.build({
      total: { amount: 75, currencyCode: 'USD' },
    });
    rerender(<Harness {...props} paymentRequest={updated} />);
    await waitFor(() => expect(first.close).toHaveBeenCalled());
    expect(sdk.createSession).toHaveBeenLastCalledWith({
      paymentRequest: updated,
    });
  });

  it('shows the session error with Retry when the SDK fails to load', async () => {
    vi.mocked(loadScriptModule.loadScript).mockRejectedValueOnce(
      new Error('blocked')
    );
    const sdk = installFakeSdk();
    const onError = vi.fn<(error: Error) => void>();
    render(<Harness {...defaultProps({ onError })} />);
    expect(
      await screen.findByText('Failed to prepare checkout. Please try again.')
    ).toBeInTheDocument();
    expect(onError.mock.calls[0][0].message).toBe('blocked');
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(sdk.render).toHaveBeenCalled());
  });

  it('closes the session on unmount', async () => {
    const sdk = installFakeSdk();
    const { unmount } = render(<Harness {...defaultProps()} />);
    await waitFor(() => expect(sdk.render).toHaveBeenCalled());
    unmount();
    expect(sdk.current().close).toHaveBeenCalled();
  });

  it('hands the session to the newest step and back on unmount', async () => {
    const sdk = installFakeSdk();
    function Page({ showSecond }: { showSecond: boolean }) {
      return (
        <>
          <Harness {...defaultProps()} />
          {showSecond && <Harness {...defaultProps()} />}
        </>
      );
    }
    const { rerender } = render(<Page showSecond={false} />);
    await waitFor(() => expect(sdk.render).toHaveBeenCalledTimes(1));
    const first = sdk.current();

    rerender(<Page showSecond />);
    await waitFor(() => expect(sdk.render).toHaveBeenCalledTimes(2));
    const second = sdk.current();
    expect(first.close).toHaveBeenCalled();
    expect(second).not.toBe(first);
    expect(second.close).not.toHaveBeenCalled();

    rerender(<Page showSecond={false} />);
    expect(second.close).toHaveBeenCalled();
    const resumed = sdk.current();
    expect(resumed).not.toBe(second);
    expect(resumed.close).not.toHaveBeenCalled();
    expect(sdk.createSession).toHaveBeenCalledTimes(3);
  });

  it('keeps a paused step from starting a session on a cart change', async () => {
    const sdk = installFakeSdk();
    const props = defaultProps();
    function Page({ request }: { request: typeof paymentRequest }) {
      return (
        <>
          <Harness {...props} paymentRequest={request} />
          <Harness {...defaultProps()} />
        </>
      );
    }
    const { rerender } = render(<Page request={paymentRequest} />);
    await waitFor(() => expect(sdk.render).toHaveBeenCalledTimes(2));
    const sessionsBefore = sdk.createSession.mock.calls.length;
    rerender(
      <Page
        request={shopPayPaymentRequest.build({
          total: { amount: 75, currencyCode: 'USD' },
        })}
      />
    );
    await act(() => Promise.resolve());
    expect(sdk.createSession).toHaveBeenCalledTimes(sessionsBefore);
  });
});

describe('waitForReceipt', () => {
  it('checks until the receipt leaves processing', async () => {
    const check = vi
      .fn<(token: string) => Promise<ShopPayReceiptStatus>>()
      .mockResolvedValueOnce({ state: 'processing' })
      .mockResolvedValueOnce({ state: 'completed' });
    await expect(waitForReceipt(check, 'r', 5, 0)).resolves.toEqual({
      state: 'completed',
    });
    expect(check).toHaveBeenCalledTimes(2);
  });

  it('returns processing after the last attempt', async () => {
    const check = vi
      .fn<(token: string) => Promise<ShopPayReceiptStatus>>()
      .mockResolvedValue({ state: 'processing' });
    await expect(waitForReceipt(check, 'r', 3, 0)).resolves.toEqual({
      state: 'processing',
    });
    expect(check).toHaveBeenCalledTimes(3);
  });
});
