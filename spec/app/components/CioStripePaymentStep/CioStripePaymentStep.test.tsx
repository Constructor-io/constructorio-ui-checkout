import { act, render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { CioFlowStep } from '@src/app/components/CioFlowStep';
import { CioStripePaymentStep } from '@src/app/components/CioStripePaymentStep';
import { useCioCheckout } from '@src/app/hooks/useCioCheckout';
import { CioCheckoutProvider } from '@src/app/providers/CioCheckoutProvider';
import { PAYMENT_STEP } from '@src/core/types';
import type { StripePaymentSession } from '@src/types';

const sessionResponse = (id = 'cs_test_abc'): StripePaymentSession => ({
  clientSecret: `${id}_secret_xyz`,
  publishableKey: 'pk_test',
});

const stubSession = () => Promise.resolve(sessionResponse());

describe(`${CioStripePaymentStep.name}: client`, () => {
  beforeEach(() => {
    (globalThis as Record<string, unknown>).__capturedProviderOptions__ =
      undefined;
  });

  it('auto-creates a session on mount and renders the Stripe provider', async () => {
    function Harness() {
      return (
        <CioCheckoutProvider
          provider="stripe"
          steps={[{ id: PAYMENT_STEP }]}
          onCreateSession={stubSession}
          autoStart
        >
          <CioFlowStep id={PAYMENT_STEP}>
            <CioStripePaymentStep />
          </CioFlowStep>
        </CioCheckoutProvider>
      );
    }
    render(<Harness />);
    expect(await screen.findByTestId('stripe-provider')).toBeInTheDocument();
    expect(screen.getByTestId('stripe-checkout-form')).toBeInTheDocument();
  });

  it('renders form mode (CheckoutForm) by default', async () => {
    render(
      <CioCheckoutProvider
        provider="stripe"
        steps={[{ id: PAYMENT_STEP }]}
        onCreateSession={stubSession}
        autoStart
      >
        <CioFlowStep id={PAYMENT_STEP}>
          <CioStripePaymentStep />
        </CioFlowStep>
      </CioCheckoutProvider>
    );
    expect(
      await screen.findByTestId('stripe-checkout-form')
    ).toBeInTheDocument();
  });

  it('renders elements mode when uiMode="elements"', async () => {
    render(
      <CioCheckoutProvider
        provider="stripe"
        steps={[{ id: PAYMENT_STEP }]}
        onCreateSession={stubSession}
        autoStart
      >
        <CioFlowStep id={PAYMENT_STEP}>
          <CioStripePaymentStep uiMode="elements" />
        </CioFlowStep>
      </CioCheckoutProvider>
    );
    expect(
      await screen.findByTestId('stripe-payment-element')
    ).toBeInTheDocument();
  });

  it('advances the flow on payment completion', async () => {
    const events: string[] = [];
    function Harness() {
      const flow = useCioCheckout();
      events.push(String(flow.state.currentStepId));
      return (
        <CioFlowStep id={PAYMENT_STEP}>
          <CioStripePaymentStep />
        </CioFlowStep>
      );
    }
    render(
      <CioCheckoutProvider
        provider="stripe"
        steps={[{ id: PAYMENT_STEP }, { id: 'done' }]}
        onCreateSession={stubSession}
        autoStart
      >
        <Harness />
      </CioCheckoutProvider>
    );
    const user = userEvent.setup();
    await user.click(await screen.findByTestId('stripe-checkout-form'));
    await waitFor(() => {
      expect(events.at(-1)).toBe('done');
    });
  });

  it('renders nothing while session is being created', async () => {
    render(
      <CioCheckoutProvider
        provider="stripe"
        steps={[{ id: PAYMENT_STEP }]}
        onCreateSession={() =>
          new Promise<StripePaymentSession>(() => undefined)
        }
        autoStart
      >
        <CioFlowStep id={PAYMENT_STEP}>
          <CioStripePaymentStep />
        </CioFlowStep>
      </CioCheckoutProvider>
    );
    await waitFor(() => {
      expect(screen.queryByTestId('stripe-provider')).not.toBeInTheDocument();
    });
  });

  it('shows error UI with Retry when createSession rejects, and recovers on retry', async () => {
    let calls = 0;
    const onCreateSession = vi.fn(() => {
      calls += 1;
      if (calls === 1) return Promise.reject(new Error('boom'));
      return Promise.resolve(sessionResponse('cs_test_retry'));
    });
    const onError = vi.fn();
    render(
      <CioCheckoutProvider
        provider="stripe"
        steps={[{ id: PAYMENT_STEP }]}
        onCreateSession={onCreateSession}
        autoStart
      >
        <CioFlowStep id={PAYMENT_STEP}>
          <CioStripePaymentStep onError={onError} />
        </CioFlowStep>
      </CioCheckoutProvider>
    );
    const retryBtn = await screen.findByRole('button', { name: /retry/i });
    expect(retryBtn).toBeInTheDocument();
    expect(onError).toHaveBeenCalledTimes(1);
    await userEvent.setup().click(retryBtn);
    expect(await screen.findByTestId('stripe-provider')).toBeInTheDocument();
    expect(onCreateSession).toHaveBeenCalledTimes(2);
  });

  it('auto-recreates the session when status is expired', async () => {
    let firstResolved = false;
    const onCreateSession = vi.fn(() => {
      const id = firstResolved ? 'cs_test_second' : 'cs_test_first';
      firstResolved = true;
      return Promise.resolve(sessionResponse(id));
    });
    let flowRef!: ReturnType<typeof useCioCheckout>;
    function Grabber() {
      const f = useCioCheckout();
      flowRef = f;
      return null;
    }
    render(
      <CioCheckoutProvider
        provider="stripe"
        steps={[{ id: PAYMENT_STEP }]}
        onCreateSession={onCreateSession}
        autoStart
      >
        <Grabber />
        <CioFlowStep id={PAYMENT_STEP}>
          <CioStripePaymentStep />
        </CioFlowStep>
      </CioCheckoutProvider>
    );
    await screen.findByTestId('stripe-provider');
    expect(onCreateSession).toHaveBeenCalledTimes(1);
    await act(async () => {
      flowRef.markExpired();
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(onCreateSession).toHaveBeenCalledTimes(2);
    });
  });
});
