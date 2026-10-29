import { act, render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { CioCheckoutStep } from '@src/app/components/CioCheckoutStep';
import {
  CioFiservPaymentStep,
  FISERV_FIELD_IDS,
  isCaptured,
} from '@src/app/components/CioFiservPaymentStep';
import { useCioCheckout } from '@src/app/hooks/useCioCheckout';
import { CioCheckoutProvider } from '@src/app/providers/CioCheckoutProvider';
import { PAYMENT_STEP } from '@src/core/types';
import type { FiservSubmitResult } from '@src/types';
import * as loadScriptModule from '@src/utils/loadScript';

import { fiservSession } from '../../../factory';

type Hooks = {
  onFormValid: () => void;
  onFormNoLongerValid: () => void;
  onCardBrandChange: (brand: unknown) => void;
};

function installFakeSdk(
  submit: () => Promise<FiservSubmitResult> = () =>
    Promise.resolve({ gatewayResponse: { transactionState: 'CAPTURED' } })
) {
  const init = vi.fn(() => Promise.resolve());
  const destroyFields = vi.fn();
  let hooks: Hooks | null = null;
  const paymentFields = vi.fn((options: Record<string, unknown>) => {
    hooks = options.hooks as Hooks;
    return Promise.resolve({ submit, destroyFields });
  });
  window.fiserv = { init, components: { paymentFields } };
  return {
    init,
    paymentFields,
    destroyFields,
    hooks: () => hooks!,
  };
}

const stubSession = () => Promise.resolve(fiservSession.build());

function Harness(props: React.ComponentProps<typeof CioFiservPaymentStep>) {
  return (
    <CioCheckoutProvider
      provider="fiserv"
      steps={[{ id: PAYMENT_STEP }, { id: 'done' }]}
      onCreateSession={stubSession}
      autoStart
    >
      <CioCheckoutStep id={PAYMENT_STEP}>
        <CioFiservPaymentStep {...props} />
      </CioCheckoutStep>
    </CioCheckoutProvider>
  );
}

describe(`${CioFiservPaymentStep.name}: client`, () => {
  beforeEach(() => {
    vi.spyOn(loadScriptModule, 'loadScript').mockResolvedValue(undefined);
  });

  afterEach(() => {
    delete window.fiserv;
  });

  it('throws outside provider="fiserv"', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() =>
      render(
        <CioCheckoutProvider
          provider="stripe"
          steps={[{ id: PAYMENT_STEP }]}
          onCreateSession={() =>
            Promise.resolve({
              clientSecret: 'cs_a_secret_b',
              publishableKey: 'pk',
            })
          }
        >
          <CioFiservPaymentStep />
        </CioCheckoutProvider>
      )
    ).toThrow('provider="fiserv"');
  });

  it('inits the SDK with the session and mounts the fields', async () => {
    const sdk = installFakeSdk();
    render(<Harness frameAncestors={['https://shop.test']} />);

    await waitFor(() => expect(sdk.paymentFields).toHaveBeenCalledTimes(1));
    expect(sdk.init).toHaveBeenCalledWith(
      expect.objectContaining({
        environment: 'CERT',
        accessToken: 'at_test',
        apiKey: 'api_test',
        merchantId: 'm_test',
        terminalId: 't_test',
        additionalFrameAncestors: ['https://shop.test'],
      })
    );
    const fields = sdk.paymentFields.mock.calls[0][0] as unknown as {
      data: { fields: Record<string, { parentElementId: string }> };
    };
    expect(fields.data.fields.cardNumber.parentElementId).toBe(
      FISERV_FIELD_IDS.cardNumber
    );
    await waitFor(() =>
      expect(
        screen.queryByText('Preparing checkout...')
      ).not.toBeInTheDocument()
    );
    expect(
      // eslint-disable-next-line testing-library/no-node-access
      document.getElementById(FISERV_FIELD_IDS.securityCode)
    ).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Pay' })).toBeDisabled();
  });

  it('enables Pay when the form is valid and shows the amount', async () => {
    const sdk = installFakeSdk();
    render(<Harness amount="$12.00" />);
    await waitFor(() => expect(sdk.paymentFields).toHaveBeenCalled());
    await screen.findByRole('button', { name: 'Pay $12.00' });
    act(() => sdk.hooks().onFormValid());
    expect(screen.getByRole('button', { name: 'Pay $12.00' })).toBeEnabled();
    act(() => sdk.hooks().onFormNoLongerValid());
    expect(screen.getByRole('button', { name: 'Pay $12.00' })).toBeDisabled();
  });

  it('forwards card brand changes', async () => {
    const sdk = installFakeSdk();
    const onCardBrandChange = vi.fn();
    render(<Harness onCardBrandChange={onCardBrandChange} />);
    await waitFor(() => expect(sdk.paymentFields).toHaveBeenCalled());
    act(() => sdk.hooks().onCardBrandChange('visa'));
    act(() => sdk.hooks().onCardBrandChange(undefined));
    expect(onCardBrandChange).toHaveBeenNthCalledWith(1, 'visa');
    expect(onCardBrandChange).toHaveBeenNthCalledWith(2, null);
  });

  it('advances the flow after a captured submit', async () => {
    const sdk = installFakeSdk();
    const steps: string[] = [];
    function Probe() {
      steps.push(String(useCioCheckout().state.currentStepId));
      return null;
    }
    render(
      <CioCheckoutProvider
        provider="fiserv"
        steps={[{ id: PAYMENT_STEP }, { id: 'done' }]}
        onCreateSession={stubSession}
        autoStart
      >
        <Probe />
        <CioCheckoutStep id={PAYMENT_STEP}>
          <CioFiservPaymentStep />
        </CioCheckoutStep>
      </CioCheckoutProvider>
    );
    await waitFor(() => expect(sdk.paymentFields).toHaveBeenCalled());
    await screen.findByRole('button', { name: 'Pay' });
    act(() => sdk.hooks().onFormValid());
    await userEvent.click(screen.getByRole('button', { name: 'Pay' }));
    await waitFor(() => expect(steps.at(-1)).toBe('done'));
  });

  it('shows an error and emits payment.confirm when the submit is not captured', async () => {
    const sdk = installFakeSdk(() =>
      Promise.resolve({ gatewayResponse: { transactionState: 'DECLINED' } })
    );
    const onError = vi.fn<(error: Error) => void>();
    render(<Harness onError={onError} />);
    await waitFor(() => expect(sdk.paymentFields).toHaveBeenCalled());
    await screen.findByRole('button', { name: 'Pay' });
    act(() => sdk.hooks().onFormValid());
    await userEvent.click(screen.getByRole('button', { name: 'Pay' }));
    expect(
      await screen.findByText(/could not be accepted/i)
    ).toBeInTheDocument();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0].message).toMatch(/could not be accepted/i);
  });

  it('shows the session error with Retry when the SDK fails to init', async () => {
    const sdk = installFakeSdk();
    sdk.init.mockRejectedValueOnce(new Error('bad token'));
    const onError = vi.fn<(error: Error) => void>();
    render(<Harness onError={onError} />);
    expect(
      await screen.findByText('Failed to prepare checkout. Please try again.')
    ).toBeInTheDocument();
    expect(onError.mock.calls[0][0].message).toBe('bad token');
    sdk.paymentFields.mockImplementationOnce((options) => {
      const { parentElementId } = (
        options as {
          data: { fields: { cardNumber: { parentElementId: string } } };
        }
      ).data.fields.cardNumber;
      // eslint-disable-next-line testing-library/no-node-access
      expect(document.getElementById(parentElementId)).not.toBeNull();
      return Promise.resolve({ submit: vi.fn(), destroyFields: vi.fn() });
    });
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(sdk.init).toHaveBeenCalledTimes(2));
    await screen.findByRole('button', { name: 'Pay' });
  });

  it('swaps the fields for a new session', async () => {
    const sdk = installFakeSdk();
    let flow: ReturnType<typeof useCioCheckout> | null = null;
    function Probe() {
      flow = useCioCheckout();
      return null;
    }
    render(
      <CioCheckoutProvider
        provider="fiserv"
        steps={[{ id: PAYMENT_STEP }, { id: 'done' }]}
        onCreateSession={stubSession}
        autoStart
      >
        <Probe />
        <CioCheckoutStep id={PAYMENT_STEP}>
          <CioFiservPaymentStep />
        </CioCheckoutStep>
      </CioCheckoutProvider>
    );
    await screen.findByRole('button', { name: 'Pay' });

    await act(async () => {
      await flow!.recreate();
    });

    await waitFor(() => expect(sdk.paymentFields).toHaveBeenCalledTimes(2));
    expect(sdk.init).toHaveBeenCalledTimes(2);
    expect(sdk.destroyFields).toHaveBeenCalledTimes(1);
  });

  it('destroys the fields on unmount', async () => {
    const sdk = installFakeSdk();
    const { unmount } = render(<Harness />);
    await waitFor(() => expect(sdk.paymentFields).toHaveBeenCalled());
    await screen.findByRole('button', { name: 'Pay' });
    unmount();
    expect(sdk.destroyFields).toHaveBeenCalledTimes(1);
  });

  it('shows the configuration error without onCreateSession', async () => {
    const onError = vi.fn<(error: Error) => void>();
    render(
      <CioCheckoutProvider
        provider="fiserv"
        steps={[{ id: PAYMENT_STEP }]}
        autoStart
      >
        <CioCheckoutStep id={PAYMENT_STEP}>
          <CioFiservPaymentStep onError={onError} />
        </CioCheckoutStep>
      </CioCheckoutProvider>
    );
    expect(
      await screen.findByText(
        'This payment step needs an onCreateSession handler.'
      )
    ).toBeInTheDocument();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('uses translations for the field labels', async () => {
    installFakeSdk();
    render(
      <Harness
        translations={{ 'CioCheckout.fiserv.cardNumberLabel': 'Card no.' }}
      />
    );
    expect(await screen.findByText('Card no.')).toBeInTheDocument();
  });
});

describe(`${isCaptured.name}: client`, () => {
  it('prefers isSuccessful, then the CAPTURED state', () => {
    expect(isCaptured({ isSuccessful: true })).toBe(true);
    expect(
      isCaptured({
        isSuccessful: false,
        gatewayResponse: { transactionState: 'CAPTURED' },
      })
    ).toBe(false);
    expect(
      isCaptured({ gatewayResponse: { transactionState: 'CAPTURED' } })
    ).toBe(true);
    expect(isCaptured({})).toBe(false);
  });
});
