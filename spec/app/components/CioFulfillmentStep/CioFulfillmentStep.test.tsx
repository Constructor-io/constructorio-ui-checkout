import { act, render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { CioCheckoutStep } from '@src/app/components/CioCheckoutStep';
import {
  type CioFulfillmentResult,
  CioFulfillmentStep,
} from '@src/app/components/CioFulfillmentStep';
import { useCioCheckout } from '@src/app/hooks/useCioCheckout';
import { CioCheckoutProvider } from '@src/app/providers/CioCheckoutProvider';

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
      <CioCheckoutProvider
        provider="stripe"
        steps={[{ id: 'fulfill' }]}
        onCreateSession={stubSession}
        autoStart
      >
        <CioCheckoutStep id="fulfill">
          <CioFulfillmentStep onFulfill={onFulfill} />
        </CioCheckoutStep>
      </CioCheckoutProvider>
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
      const flow = useCioCheckout();
      events.push(String(flow.state.currentStepId));
      return null;
    }

    render(
      <CioCheckoutProvider
        provider="stripe"
        steps={[{ id: 'fulfill' }, { id: 'done' }]}
        onCreateSession={stubSession}
        autoStart
      >
        <Probe />
        <CioCheckoutStep id="fulfill">
          <CioFulfillmentStep
            onFulfill={() =>
              Promise.resolve({ success: true, message: 'Order #123' })
            }
          />
        </CioCheckoutStep>
      </CioCheckoutProvider>
    );

    await waitFor(() => {
      expect(events.at(-1)).toBe('done');
    });
  });

  it('advances and emits flow.completed before onFulfillComplete, even when the callback clears state', async () => {
    const order: string[] = [];
    let attempts = 0;
    let flowRef: ReturnType<typeof useCioCheckout> | null = null;
    function Probe() {
      flowRef = useCioCheckout();
      return null;
    }

    render(
      <CioCheckoutProvider
        provider="stripe"
        steps={[{ id: 'fulfill' }]}
        onCreateSession={stubSession}
        autoStart
        onEvent={(e) => {
          if (e.type === 'flow.completed' || e.type === 'error') {
            order.push(e.type);
          }
        }}
      >
        <Probe />
        <CioCheckoutStep id="fulfill">
          <CioFulfillmentStep
            onFulfill={() => {
              attempts += 1;
              return Promise.resolve<CioFulfillmentResult>(
                attempts === 1
                  ? { success: true, message: 'Order #123' }
                  : { success: false, message: 'No second order' }
              );
            }}
            onFulfillComplete={(result) => {
              order.push('onFulfillComplete');
              if (result.success) void flowRef?.clearState();
            }}
          />
        </CioCheckoutStep>
      </CioCheckoutProvider>
    );

    await waitFor(() => {
      expect(order).toContain('onFulfillComplete');
    });
    expect(order.slice(0, 2)).toEqual(['flow.completed', 'onFulfillComplete']);
    expect(order).not.toContain('error');
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
      <CioCheckoutProvider
        provider="stripe"
        steps={[{ id: 'fulfill' }, { id: 'done' }]}
        onCreateSession={stubSession}
        autoStart
      >
        <CioCheckoutStep id="fulfill">
          <CioFulfillmentStep advanceOnSuccess={false} onFulfill={onFulfill} />
        </CioCheckoutStep>
      </CioCheckoutProvider>
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
      const flow = useCioCheckout();
      events.push(String(flow.state.currentStepId));
      return null;
    }

    render(
      <CioCheckoutProvider
        provider="stripe"
        steps={[{ id: 'fulfill' }, { id: 'done' }]}
        onCreateSession={stubSession}
        autoStart
      >
        <Probe />
        <CioCheckoutStep id="fulfill">
          <CioFulfillmentStep
            advanceOnSuccess={false}
            onFulfill={() => Promise.resolve({ success: true })}
          />
        </CioCheckoutStep>
      </CioCheckoutProvider>
    );

    expect(await screen.findByText('Order confirmed')).toBeInTheDocument();
    expect(events.at(-1)).toBe('fulfill');
  });

  it('supports a custom render prop', async () => {
    render(
      <CioCheckoutProvider
        provider="stripe"
        steps={[{ id: 'fulfill' }]}
        onCreateSession={stubSession}
        autoStart
      >
        <CioCheckoutStep id="fulfill">
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
        </CioCheckoutStep>
      </CioCheckoutProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId('custom-status')).toHaveTextContent(
        'fulfilled:Custom rendered'
      )
    );
  });

  it('handles a throwing onFulfill as a failure', async () => {
    render(
      <CioCheckoutProvider
        provider="stripe"
        steps={[{ id: 'fulfill' }]}
        onCreateSession={stubSession}
        autoStart
      >
        <CioCheckoutStep id="fulfill">
          <CioFulfillmentStep
            onFulfill={() => Promise.reject(new Error('server down'))}
          />
        </CioCheckoutStep>
      </CioCheckoutProvider>
    );
    expect(await screen.findByText('server down')).toBeInTheDocument();
  });

  describe('recreateSessionOnRetry', () => {
    const setupFailing = (
      onCreateSession: () => Promise<{
        clientSecret: string;
        publishableKey: string;
      }>,
      recreateSessionOnRetry?: boolean
    ) => {
      const onFulfill = vi.fn(() =>
        Promise.resolve<CioFulfillmentResult>({
          success: false,
          message: 'Charge failed',
        })
      );
      render(
        <CioCheckoutProvider
          provider="stripe"
          steps={[{ id: 'fulfill' }]}
          onCreateSession={onCreateSession}
          autoStart
        >
          <CioCheckoutStep id="fulfill">
            <CioFulfillmentStep
              onFulfill={onFulfill}
              recreateSessionOnRetry={recreateSessionOnRetry}
            />
          </CioCheckoutStep>
        </CioCheckoutProvider>
      );
      return onFulfill;
    };

    it('does not recreate the session by default', async () => {
      const onCreateSession = vi.fn(stubSession);
      const onFulfill = setupFailing(onCreateSession);
      await userEvent
        .setup()
        .click(await screen.findByRole('button', { name: 'Retry' }));
      await waitFor(() => expect(onFulfill).toHaveBeenCalledTimes(2));
      expect(onCreateSession).not.toHaveBeenCalled();
    });

    it('recreates the session before re-running onFulfill', async () => {
      const order: string[] = [];
      const onCreateSession = vi.fn(() => {
        order.push('create');
        return stubSession();
      });
      const onFulfill = setupFailing(onCreateSession, true);
      onFulfill.mockImplementation(() => {
        order.push('fulfill');
        return Promise.resolve({ success: false, message: 'Charge failed' });
      });
      await userEvent
        .setup()
        .click(await screen.findByRole('button', { name: 'Retry' }));
      await waitFor(() => expect(onFulfill).toHaveBeenCalledTimes(2));
      expect(onCreateSession).toHaveBeenCalledTimes(1);
      expect(order.slice(-2)).toEqual(['create', 'fulfill']);
    });

    it('stays failed when recreating the session fails', async () => {
      const onCreateSession = vi.fn(() =>
        Promise.reject(new Error('create failed'))
      );
      const onFulfill = setupFailing(onCreateSession, true);
      await userEvent
        .setup()
        .click(await screen.findByRole('button', { name: 'Retry' }));
      await waitFor(() => expect(onCreateSession).toHaveBeenCalledTimes(1));
      expect(screen.getByRole('alert')).toHaveTextContent('Charge failed');
      expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
      expect(onFulfill).toHaveBeenCalledTimes(1);
    });
  });

  describe('translations', () => {
    it('renders custom labels', async () => {
      let resolveFulfill: (r: CioFulfillmentResult) => void = () => undefined;
      const onFulfill = vi.fn(
        () =>
          new Promise<CioFulfillmentResult>((resolve) => {
            resolveFulfill = resolve;
          })
      );
      render(
        <CioCheckoutProvider
          provider="stripe"
          steps={[{ id: 'fulfill' }]}
          onCreateSession={stubSession}
          autoStart
        >
          <CioCheckoutStep id="fulfill">
            <CioFulfillmentStep
              onFulfill={onFulfill}
              translations={{
                'CioCheckout.fulfillment.pendingLabel': 'Checking...',
                'CioCheckout.fulfillment.failedLabel': 'Nope',
                'CioCheckout.fulfillment.retryLabel': 'Again',
              }}
            />
          </CioCheckoutStep>
        </CioCheckoutProvider>
      );
      expect(await screen.findByText('Checking...')).toBeInTheDocument();
      await act(async () => {
        resolveFulfill({ success: false });
        await Promise.resolve();
      });
      expect(await screen.findByText('Nope')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Again' })).toBeInTheDocument();
    });

    it('uses failedLabel when onFulfill throws a non-Error', async () => {
      render(
        <CioCheckoutProvider
          provider="stripe"
          steps={[{ id: 'fulfill' }]}
          onCreateSession={stubSession}
          autoStart
        >
          <CioCheckoutStep id="fulfill">
            <CioFulfillmentStep
              // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
              onFulfill={() => Promise.reject('boom')}
              translations={{
                'CioCheckout.fulfillment.failedLabel': 'Something broke',
              }}
            />
          </CioCheckoutStep>
        </CioCheckoutProvider>
      );
      expect(await screen.findByText('Something broke')).toBeInTheDocument();
    });

    it('passes the failedLabel text to render when onFulfill throws a non-Error', async () => {
      render(
        <CioCheckoutProvider
          provider="stripe"
          steps={[{ id: 'fulfill' }]}
          onCreateSession={stubSession}
          autoStart
        >
          <CioCheckoutStep id="fulfill">
            <CioFulfillmentStep
              // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
              onFulfill={() => Promise.reject('boom')}
              render={({ result }) => (
                <span data-testid="message">{result?.message}</span>
              )}
            />
          </CioCheckoutStep>
        </CioCheckoutProvider>
      );
      await waitFor(() =>
        expect(screen.getByTestId('message').textContent).toBe(
          'Verification failed'
        )
      );
    });

    it('renders a custom success label', async () => {
      render(
        <CioCheckoutProvider
          provider="stripe"
          steps={[{ id: 'fulfill' }, { id: 'done' }]}
          onCreateSession={stubSession}
          autoStart
        >
          <CioCheckoutStep id="fulfill">
            <CioFulfillmentStep
              onFulfill={() => Promise.resolve({ success: true })}
              advanceOnSuccess={false}
              translations={{ 'CioCheckout.fulfillment.successLabel': 'Done!' }}
            />
          </CioCheckoutStep>
        </CioCheckoutProvider>
      );
      expect(await screen.findByText('Done!')).toBeInTheDocument();
    });
  });
});
