import { act, render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { CioFlowStep } from '@src/app/components/CioFlowStep';
import {
  type CioFulfillmentResult,
  CioFulfillmentStep,
} from '@src/app/components/CioFulfillmentStep';
import { useCioPayment } from '@src/app/hooks/useCioPayment';
import { CioPaymentProvider } from '@src/app/providers/CioPaymentProvider';

const stubSession = () =>
  Promise.resolve({
    clientSecret: 'cs_test_a_secret_x',
    publishableKey: 'pk_test',
  });

describe(`${CioFulfillmentStep.name}: client`, () => {
  it('runs onFulfill and shows the pending UI while in flight', async () => {
    let resolveFulfill: (r: CioFulfillmentResult) => void = () => undefined;
    const onFulfill = vi.fn(
      () =>
        new Promise<CioFulfillmentResult>((resolve) => {
          resolveFulfill = resolve;
        })
    );

    render(
      <CioPaymentProvider
        steps={[{ id: 'fulfill' }]}
        onCreateSession={stubSession}
        autoStart
      >
        <CioFlowStep id="fulfill">
          <CioFulfillmentStep onFulfill={onFulfill} />
        </CioFlowStep>
      </CioPaymentProvider>
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
      const flow = useCioPayment();
      events.push(String(flow.state.currentStepId));
      return null;
    }

    render(
      <CioPaymentProvider
        steps={[{ id: 'fulfill' }, { id: 'done' }]}
        onCreateSession={stubSession}
        autoStart
      >
        <Probe />
        <CioFlowStep id="fulfill">
          <CioFulfillmentStep
            onFulfill={() =>
              Promise.resolve({ success: true, message: 'Order #123' })
            }
          />
        </CioFlowStep>
      </CioPaymentProvider>
    );

    await waitFor(() => {
      expect(events.at(-1)).toBe('done');
    });
  });

  it('shows the failure UI with a retry button that re-runs onFulfill', async () => {
    let call = 0;
    const onFulfill = vi.fn(() => {
      call += 1;
      return Promise.resolve<CioFulfillmentResult>(
        call === 1
          ? { success: false, message: 'Verification failed' }
          : { success: true, message: 'Order confirmed' }
      );
    });

    render(
      <CioPaymentProvider
        steps={[{ id: 'fulfill' }, { id: 'done' }]}
        onCreateSession={stubSession}
        autoStart
      >
        <CioFlowStep id="fulfill">
          <CioFulfillmentStep advanceOnSuccess={false} onFulfill={onFulfill} />
        </CioFlowStep>
      </CioPaymentProvider>
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
      const flow = useCioPayment();
      events.push(String(flow.state.currentStepId));
      return null;
    }

    render(
      <CioPaymentProvider
        steps={[{ id: 'fulfill' }, { id: 'done' }]}
        onCreateSession={stubSession}
        autoStart
      >
        <Probe />
        <CioFlowStep id="fulfill">
          <CioFulfillmentStep
            advanceOnSuccess={false}
            onFulfill={() => Promise.resolve({ success: true })}
          />
        </CioFlowStep>
      </CioPaymentProvider>
    );

    expect(await screen.findByText('Order confirmed')).toBeInTheDocument();
    expect(events.at(-1)).toBe('fulfill');
  });

  it('supports a custom render prop', async () => {
    render(
      <CioPaymentProvider
        steps={[{ id: 'fulfill' }]}
        onCreateSession={stubSession}
        autoStart
      >
        <CioFlowStep id="fulfill">
          <CioFulfillmentStep
            onFulfill={() =>
              Promise.resolve({ success: true, message: 'Custom rendered' })
            }
            render={({ status, result }) => (
              <div data-testid="custom-status">
                {status}:{result?.message}
              </div>
            )}
          />
        </CioFlowStep>
      </CioPaymentProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId('custom-status')).toHaveTextContent(
        'fulfilled:Custom rendered'
      )
    );
  });

  it('handles a throwing onFulfill as a failure', async () => {
    render(
      <CioPaymentProvider
        steps={[{ id: 'fulfill' }]}
        onCreateSession={stubSession}
        autoStart
      >
        <CioFlowStep id="fulfill">
          <CioFulfillmentStep
            onFulfill={() => Promise.reject(new Error('server down'))}
          />
        </CioFlowStep>
      </CioPaymentProvider>
    );
    expect(await screen.findByText('server down')).toBeInTheDocument();
  });
});
