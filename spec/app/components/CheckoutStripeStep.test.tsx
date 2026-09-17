import { act, render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { CheckoutFlowStep } from '@src/app/components/CheckoutFlowStep';
import { CheckoutStripeStep } from '@src/app/components/CheckoutStripeStep';
import { useCheckoutFlow } from '@src/app/hooks/useCheckoutFlow';
import { CheckoutFlowProvider } from '@src/app/providers/CheckoutFlowProvider';
import { STRIPE_STEP } from '@src/core/types';
import type { CheckoutSessionResponse } from '@src/types';

const sessionResponse = (id = 'cs_test_abc'): CheckoutSessionResponse => ({
  clientSecret: `${id}_secret_xyz`,
  publishableKey: 'pk_test',
});

const stubSession = () => Promise.resolve(sessionResponse());

describe('CheckoutStripeStep', () => {
  beforeEach(() => {
    (globalThis as Record<string, unknown>).__capturedProviderOptions__ =
      undefined;
  });

  it('auto-creates a session on mount and renders the Stripe provider', async () => {
    function Harness() {
      return (
        <CheckoutFlowProvider
          steps={[{ id: STRIPE_STEP }]}
          onCreateSession={stubSession}
          autoStart
        >
          <CheckoutFlowStep id={STRIPE_STEP}>
            <CheckoutStripeStep />
          </CheckoutFlowStep>
        </CheckoutFlowProvider>
      );
    }
    render(<Harness />);
    expect(await screen.findByTestId('stripe-provider')).toBeInTheDocument();
    expect(screen.getByTestId('stripe-checkout-form')).toBeInTheDocument();
  });

  it('renders form mode (CheckoutForm) by default', async () => {
    render(
      <CheckoutFlowProvider
        steps={[{ id: STRIPE_STEP }]}
        onCreateSession={stubSession}
        autoStart
      >
        <CheckoutFlowStep id={STRIPE_STEP}>
          <CheckoutStripeStep />
        </CheckoutFlowStep>
      </CheckoutFlowProvider>
    );
    expect(
      await screen.findByTestId('stripe-checkout-form')
    ).toBeInTheDocument();
  });

  it('renders elements mode when uiMode="elements"', async () => {
    render(
      <CheckoutFlowProvider
        steps={[{ id: STRIPE_STEP }]}
        onCreateSession={stubSession}
        autoStart
      >
        <CheckoutFlowStep id={STRIPE_STEP}>
          <CheckoutStripeStep uiMode="elements" />
        </CheckoutFlowStep>
      </CheckoutFlowProvider>
    );
    expect(
      await screen.findByTestId('stripe-payment-element')
    ).toBeInTheDocument();
  });

  it('advances the flow on payment completion', async () => {
    const events: string[] = [];
    function Harness() {
      const flow = useCheckoutFlow();
      events.push(String(flow.state.currentStepId));
      return (
        <CheckoutFlowStep id={STRIPE_STEP}>
          <CheckoutStripeStep />
        </CheckoutFlowStep>
      );
    }
    render(
      <CheckoutFlowProvider
        steps={[{ id: STRIPE_STEP }, { id: 'done' }]}
        onCreateSession={stubSession}
        autoStart
      >
        <Harness />
      </CheckoutFlowProvider>
    );
    const user = userEvent.setup();
    await user.click(await screen.findByTestId('stripe-checkout-form'));
    await waitFor(() => {
      expect(events.at(-1)).toBe('done');
    });
  });

  it('renders nothing while session is being created', async () => {
    render(
      <CheckoutFlowProvider
        steps={[{ id: STRIPE_STEP }]}
        onCreateSession={() => new Promise(() => undefined)}
        autoStart
      >
        <CheckoutFlowStep id={STRIPE_STEP}>
          <CheckoutStripeStep />
        </CheckoutFlowStep>
      </CheckoutFlowProvider>
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
      <CheckoutFlowProvider
        steps={[{ id: STRIPE_STEP }]}
        onCreateSession={onCreateSession}
        autoStart
      >
        <CheckoutFlowStep id={STRIPE_STEP}>
          <CheckoutStripeStep onError={onError} />
        </CheckoutFlowStep>
      </CheckoutFlowProvider>
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
    let flowRef!: ReturnType<typeof useCheckoutFlow>;
    function Grabber() {
      const f = useCheckoutFlow();
      flowRef = f;
      return null;
    }
    render(
      <CheckoutFlowProvider
        steps={[{ id: STRIPE_STEP }]}
        onCreateSession={onCreateSession}
        autoStart
      >
        <Grabber />
        <CheckoutFlowStep id={STRIPE_STEP}>
          <CheckoutStripeStep />
        </CheckoutFlowStep>
      </CheckoutFlowProvider>
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
