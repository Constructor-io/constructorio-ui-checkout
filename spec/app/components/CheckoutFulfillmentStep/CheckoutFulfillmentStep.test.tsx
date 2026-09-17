import { act, render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { CheckoutFlowStep } from '@src/app/components/CheckoutFlowStep';
import {
  CheckoutFulfillmentStep,
  type FulfillmentResult,
} from '@src/app/components/CheckoutFulfillmentStep';
import { useCheckoutFlow } from '@src/app/hooks/useCheckoutFlow';
import { CheckoutFlowProvider } from '@src/app/providers/CheckoutFlowProvider';

const stubSession = () =>
  Promise.resolve({
    clientSecret: 'cs_test_a_secret_x',
    publishableKey: 'pk_test',
  });

describe(`${CheckoutFulfillmentStep.name}: client`, () => {
  it('runs onFulfill and shows the pending UI while in flight', async () => {
    let resolveFulfill: (r: FulfillmentResult) => void = () => undefined;
    const onFulfill = vi.fn(
      () =>
        new Promise<FulfillmentResult>((resolve) => {
          resolveFulfill = resolve;
        })
    );

    render(
      <CheckoutFlowProvider
        steps={[{ id: 'fulfill' }]}
        onCreateSession={stubSession}
        autoStart
      >
        <CheckoutFlowStep id="fulfill">
          <CheckoutFulfillmentStep onFulfill={onFulfill} />
        </CheckoutFlowStep>
      </CheckoutFlowProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Verifying your order...')).toBeInTheDocument();
    });
    expect(onFulfill).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveFulfill({ success: true, message: 'Confirmed' });
      await Promise.resolve();
    });
  });

  it('advances the flow on success by default', async () => {
    const events: string[] = [];
    function Probe() {
      const flow = useCheckoutFlow();
      events.push(String(flow.state.currentStepId));
      return null;
    }

    render(
      <CheckoutFlowProvider
        steps={[{ id: 'fulfill' }, { id: 'done' }]}
        onCreateSession={stubSession}
        autoStart
      >
        <Probe />
        <CheckoutFlowStep id="fulfill">
          <CheckoutFulfillmentStep
            onFulfill={() =>
              Promise.resolve({ success: true, message: 'Order #123' })
            }
          />
        </CheckoutFlowStep>
      </CheckoutFlowProvider>
    );

    await waitFor(() => {
      expect(events.at(-1)).toBe('done');
    });
  });

  it('shows the failure UI with a retry button that re-runs onFulfill', async () => {
    let call = 0;
    const onFulfill = vi.fn(() => {
      call += 1;
      return Promise.resolve<FulfillmentResult>(
        call === 1
          ? { success: false, message: 'Verification failed' }
          : { success: true, message: 'Order confirmed' }
      );
    });

    render(
      <CheckoutFlowProvider
        steps={[{ id: 'fulfill' }, { id: 'done' }]}
        onCreateSession={stubSession}
        autoStart
      >
        <CheckoutFlowStep id="fulfill">
          <CheckoutFulfillmentStep
            advanceOnSuccess={false}
            onFulfill={onFulfill}
          />
        </CheckoutFlowStep>
      </CheckoutFlowProvider>
    );

    expect(await screen.findByText('Verification failed')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => {
      expect(screen.getByText('Order confirmed')).toBeInTheDocument();
    });
    expect(onFulfill).toHaveBeenCalledTimes(2);
  });

  it('respects advanceOnSuccess=false — does not advance on success', async () => {
    const events: string[] = [];
    function Probe() {
      const flow = useCheckoutFlow();
      events.push(String(flow.state.currentStepId));
      return null;
    }

    render(
      <CheckoutFlowProvider
        steps={[{ id: 'fulfill' }, { id: 'done' }]}
        onCreateSession={stubSession}
        autoStart
      >
        <Probe />
        <CheckoutFlowStep id="fulfill">
          <CheckoutFulfillmentStep
            advanceOnSuccess={false}
            onFulfill={() => Promise.resolve({ success: true })}
          />
        </CheckoutFlowStep>
      </CheckoutFlowProvider>
    );

    expect(await screen.findByText('Order confirmed')).toBeInTheDocument();
    expect(events.at(-1)).toBe('fulfill');
  });

  it('supports a custom render prop', async () => {
    render(
      <CheckoutFlowProvider
        steps={[{ id: 'fulfill' }]}
        onCreateSession={stubSession}
        autoStart
      >
        <CheckoutFlowStep id="fulfill">
          <CheckoutFulfillmentStep
            onFulfill={() =>
              Promise.resolve({ success: true, message: 'Custom rendered' })
            }
            render={({ status, result }) => (
              <div data-testid="custom-status">
                {status}:{result?.message}
              </div>
            )}
          />
        </CheckoutFlowStep>
      </CheckoutFlowProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId('custom-status')).toHaveTextContent(
        'fulfilled:Custom rendered'
      )
    );
  });

  it('handles a throwing onFulfill as a failure', async () => {
    render(
      <CheckoutFlowProvider
        steps={[{ id: 'fulfill' }]}
        onCreateSession={stubSession}
        autoStart
      >
        <CheckoutFlowStep id="fulfill">
          <CheckoutFulfillmentStep
            onFulfill={() => Promise.reject(new Error('server down'))}
          />
        </CheckoutFlowStep>
      </CheckoutFlowProvider>
    );
    expect(await screen.findByText('server down')).toBeInTheDocument();
  });
});
