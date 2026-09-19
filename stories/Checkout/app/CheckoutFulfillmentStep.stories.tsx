import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react';

import { CioFlowStep } from '@src/app/components/CioFlowStep';
import {
  CioFulfillmentStep,
  type CioFulfillmentResult,
} from '@src/app/components/CioFulfillmentStep';
import { useCheckoutFlow } from '@src/app/hooks/useCheckoutFlow';
import { CioPaymentProvider } from '@src/app/providers/CioPaymentProvider';

const stubSession = () =>
  Promise.resolve({
    clientSecret: 'cs_test_DEMO_secret_xyz',
    publishableKey: 'pk_test_DEMO',
  });

const meta: Meta<typeof CioFulfillmentStep> = {
  title: 'Components/CioFulfillmentStep',
  component: CioFulfillmentStep,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof CioFulfillmentStep>;

function StepShell({ children }: { children: React.ReactNode }) {
  const flow = useCheckoutFlow();
  if (flow.state.currentStepId === null) {
    return (
      <button
        type="button"
        onClick={() => {
          flow.start().catch(console.error);
        }}
      >
        Start
      </button>
    );
  }
  return (
    <div>
      <div style={{ fontSize: 13, opacity: 0.6, marginBottom: 8 }}>
        Current step: <strong>{flow.state.currentStepId}</strong>
      </div>
      {children}
    </div>
  );
}

function delay<T>(value: T, ms = 600): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export const Success: Story = {
  name: 'Success (auto-advance)',
  parameters: {
    docs: {
      description: {
        story:
          'Default happy path — `onFulfill` resolves with `success: true`, the step renders the success banner and then calls `flow.next()`.',
      },
    },
  },
  render: () => (
    <CioPaymentProvider
      steps={[{ id: 'fulfill' }, { id: 'done' }]}
      onCreateSession={stubSession}
    >
      <StepShell>
        <CioFlowStep id="fulfill">
          <CioFulfillmentStep
            onFulfill={() =>
              delay<CioFulfillmentResult>({
                success: true,
                message: 'Order #12345 confirmed',
              })
            }
          />
        </CioFlowStep>
        <CioFlowStep id="done">
          <div style={{ padding: 12, background: '#e8f6ee', borderRadius: 6 }}>
            <strong>Done</strong> — flow advanced.
          </div>
        </CioFlowStep>
      </StepShell>
    </CioPaymentProvider>
  ),
};

export const Failure: Story = {
  name: 'Failure (retry)',
  parameters: {
    docs: {
      description: {
        story:
          '`onFulfill` rejects — the step renders the failure banner with a Retry button. Retry re-runs `onFulfill` without touching session state.',
      },
    },
  },
  render: () => (
    <CioPaymentProvider
      steps={[{ id: 'fulfill' }]}
      onCreateSession={stubSession}
    >
      <StepShell>
        <CioFlowStep id="fulfill">
          <CioFulfillmentStep
            onFulfill={() =>
              delay<CioFulfillmentResult>({
                success: false,
                message: 'Warehouse unreachable — try again',
              })
            }
          />
        </CioFlowStep>
      </StepShell>
    </CioPaymentProvider>
  ),
};

export const CustomRender: Story = {
  name: 'Custom render prop',
  parameters: {
    docs: {
      description: {
        story:
          'Pass a `render` prop to fully own the UI. You receive `{ status, result, retry, advance }` and can render whatever fits your app.',
      },
    },
  },
  render: () => (
    <CioPaymentProvider
      steps={[{ id: 'fulfill' }, { id: 'done' }]}
      onCreateSession={stubSession}
    >
      <StepShell>
        <CioFlowStep id="fulfill">
          <CioFulfillmentStep
            advanceOnSuccess={false}
            onFulfill={() =>
              delay<CioFulfillmentResult>({
                success: true,
                message: 'Order verified',
              })
            }
            render={({ status, result, retry, advance }) => (
              <div
                style={{
                  padding: 16,
                  border: '1px solid #ddd',
                  borderRadius: 6,
                }}
              >
                <div style={{ marginBottom: 8 }}>
                  Status: <strong>{status}</strong>
                </div>
                {result && (
                  <div style={{ marginBottom: 8, fontSize: 13, opacity: 0.7 }}>
                    {result.message}
                  </div>
                )}
                {status === 'failed' && (
                  <button type="button" onClick={retry}>
                    Retry
                  </button>
                )}
                {status === 'fulfilled' && (
                  <button type="button" onClick={advance}>
                    Continue
                  </button>
                )}
              </div>
            )}
          />
        </CioFlowStep>
        <CioFlowStep id="done">
          <div style={{ padding: 12, background: '#e8f6ee', borderRadius: 6 }}>
            <strong>Done</strong>
          </div>
        </CioFlowStep>
      </StepShell>
    </CioPaymentProvider>
  ),
};

function FlakyDemo() {
  const [attempt, setAttempt] = useState(0);
  return (
    <CioPaymentProvider
      steps={[{ id: 'fulfill' }, { id: 'done' }]}
      onCreateSession={stubSession}
    >
      <StepShell>
        <CioFlowStep id="fulfill">
          <CioFulfillmentStep
            onFulfill={() => {
              const next = attempt + 1;
              setAttempt(next);
              return delay<CioFulfillmentResult>({
                success: next >= 2,
                message:
                  next >= 2
                    ? `Confirmed on attempt ${next}`
                    : `Attempt ${next} failed`,
              });
            }}
          />
        </CioFlowStep>
        <CioFlowStep id="done">
          <div style={{ padding: 12, background: '#e8f6ee', borderRadius: 6 }}>
            <strong>Done</strong>
          </div>
        </CioFlowStep>
      </StepShell>
    </CioPaymentProvider>
  );
}

export const RetrySucceeds: Story = {
  name: 'Retry succeeds on second attempt',
  parameters: {
    docs: {
      description: {
        story:
          'First attempt fails, second succeeds — demonstrates that Retry cleanly transitions failed → pending → fulfilled and then auto-advances.',
      },
    },
  },
  render: () => <FlakyDemo />,
};
