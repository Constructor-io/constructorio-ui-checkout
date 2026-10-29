import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react';

import { CioCheckoutStep } from '@src/app/components/CioCheckoutStep';
import {
  type CioFulfillmentResult,
  CioFulfillmentStep,
} from '@src/app/components/CioFulfillmentStep';
import { useCioCheckout } from '@src/app/hooks/useCioCheckout';
import { CioCheckoutProvider } from '@src/app/providers/CioCheckoutProvider';

const stubSession = () =>
  Promise.resolve({
    clientSecret: 'cs_test_DEMO_secret_xyz',
    publishableKey: 'pk_test_DEMO',
  });

const componentDocs = [
  'Runs `onFulfill` once when it mounts, shows a pending, success or failure state, and calls `flow.next()` on success. Use it for the step after payment, where your server confirms the order.',
  '',
  '```tsx',
  "import { CioCheckoutStep, CioFulfillmentStep } from '@constructor-io/constructorio-ui-checkout';",
  '',
  '<CioCheckoutStep id="fulfill">',
  '  <CioFulfillmentStep',
  "    onFulfill={() => fetch('/api/verify-order').then((r) => r.json())}",
  '  />',
  '</CioCheckoutStep>',
  '```',
  '',
  '`onFulfill` resolves with `{ success: boolean, message?: string }`. A rejection counts as `success: false` with the error message.',
  '',
  '**Retry.** The failure state has a Retry button. By default Retry runs `onFulfill` again with the same session. Set `recreateSessionOnRetry` for providers that use up the session on a failed charge (Fiserv, for example). Retry then calls `flow.recreate()` first and runs `onFulfill` once the new session is active. If the new session fails, the step stays in the failure state.',
  '',
  '**Translation keys.**',
  '',
  '| Key | Default |',
  '| --- | --- |',
  '| `CioCheckout.fulfillment.pendingLabel` | `Verifying your order...` |',
  '| `CioCheckout.fulfillment.successLabel` | `Order confirmed` (used when the result has no `message`) |',
  '| `CioCheckout.fulfillment.failedLabel` | `Verification failed` (used when the result has no `message`, or `onFulfill` rejects with a non-Error) |',
  '| `CioCheckout.fulfillment.retryLabel` | `Retry` |',
  '',
  '**CSS classes.** `cio-checkout-fulfillment`, with `--pending`, `--success` or `--failed`.',
].join('\n');

const meta: Meta<typeof CioFulfillmentStep> = {
  title: 'Components & Utilities/CioFulfillmentStep',
  component: CioFulfillmentStep,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: { description: { component: componentDocs } },
  },
  argTypes: {
    onFulfill: {
      description:
        'Required. Confirms the order. Resolves with `{ success, message? }`. Called once on mount and again on each Retry.',
      table: { type: { summary: '() => Promise<CioFulfillmentResult>' } },
    },
    onFulfillComplete: {
      description:
        'Called with the result after each attempt, success or failure, and after the flow has advanced when `advanceOnSuccess` is on. Safe to clear state or navigate away in. Errors thrown here are ignored.',
      table: { type: { summary: '(result: CioFulfillmentResult) => void' } },
    },
    advanceOnSuccess: {
      description:
        'Calls `flow.next()` after a successful result. Set `false` to stay on the step, for example to show the success state first.',
      table: { defaultValue: { summary: 'true' } },
    },
    recreateSessionOnRetry: {
      description:
        'When `true`, Retry calls `flow.recreate()` before running `onFulfill` again.',
      table: { defaultValue: { summary: 'false' } },
    },
    render: {
      description:
        'Replaces the built-in UI. Receives `{ status, result, retry, advance }`. `status` is `idle`, `pending`, `fulfilled` or `failed`.',
      table: {
        type: { summary: '(props: CioFulfillmentRenderProps) => ReactNode' },
      },
    },
    translations: {
      description: 'Replaces the built-in labels. See the keys above.',
      table: { type: { summary: 'Translations' } },
    },
  },
};
export default meta;
type Story = StoryObj<typeof CioFulfillmentStep>;

function StepShell({ children }: { children: React.ReactNode }) {
  const flow = useCioCheckout();
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
    <CioCheckoutProvider
      provider="stripe"
      steps={[{ id: 'fulfill' }, { id: 'done' }]}
      onCreateSession={stubSession}
    >
      <StepShell>
        <CioCheckoutStep id="fulfill">
          <CioFulfillmentStep
            onFulfill={() =>
              delay<CioFulfillmentResult>({
                success: true,
                message: 'Order #12345 confirmed',
              })
            }
          />
        </CioCheckoutStep>
        <CioCheckoutStep id="done">
          <div style={{ padding: 12, background: '#e8f6ee', borderRadius: 6 }}>
            <strong>Done</strong> — flow advanced.
          </div>
        </CioCheckoutStep>
      </StepShell>
    </CioCheckoutProvider>
  ),
};

export const Failure: Story = {
  name: 'Failure (retry)',
  parameters: {
    docs: {
      description: {
        story:
          '`onFulfill` rejects — the step renders the failure banner with a Retry button. Retry re-runs `onFulfill` without touching session state. Set `recreateSessionOnRetry` to start a fresh session first.',
      },
    },
  },
  render: () => (
    <CioCheckoutProvider
      provider="stripe"
      steps={[{ id: 'fulfill' }]}
      onCreateSession={stubSession}
    >
      <StepShell>
        <CioCheckoutStep id="fulfill">
          <CioFulfillmentStep
            onFulfill={() =>
              delay<CioFulfillmentResult>({
                success: false,
                message: 'Warehouse unreachable — try again',
              })
            }
          />
        </CioCheckoutStep>
      </StepShell>
    </CioCheckoutProvider>
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
    <CioCheckoutProvider
      provider="stripe"
      steps={[{ id: 'fulfill' }, { id: 'done' }]}
      onCreateSession={stubSession}
    >
      <StepShell>
        <CioCheckoutStep id="fulfill">
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
        </CioCheckoutStep>
        <CioCheckoutStep id="done">
          <div style={{ padding: 12, background: '#e8f6ee', borderRadius: 6 }}>
            <strong>Done</strong>
          </div>
        </CioCheckoutStep>
      </StepShell>
    </CioCheckoutProvider>
  ),
};

function FlakyDemo() {
  const [attempt, setAttempt] = useState(0);
  return (
    <CioCheckoutProvider
      provider="stripe"
      steps={[{ id: 'fulfill' }, { id: 'done' }]}
      onCreateSession={stubSession}
    >
      <StepShell>
        <CioCheckoutStep id="fulfill">
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
        </CioCheckoutStep>
        <CioCheckoutStep id="done">
          <div style={{ padding: 12, background: '#e8f6ee', borderRadius: 6 }}>
            <strong>Done</strong>
          </div>
        </CioCheckoutStep>
      </StepShell>
    </CioCheckoutProvider>
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

let demoSessionCount = 0;
const countingSession = () => {
  demoSessionCount += 1;
  return Promise.resolve({
    clientSecret: `cs_test_DEMO${demoSessionCount}_secret_xyz`,
    publishableKey: 'pk_test_DEMO',
  });
};

function SessionLabel() {
  const flow = useCioCheckout();
  return (
    <div style={{ fontSize: 13, opacity: 0.6, marginBottom: 8 }}>
      Session: <strong>{flow.state.sessionId ?? 'none'}</strong>
    </div>
  );
}

function RecreateDemo() {
  const [attempt, setAttempt] = useState(0);
  return (
    <CioCheckoutProvider
      provider="stripe"
      steps={[{ id: 'fulfill' }, { id: 'done' }]}
      onCreateSession={countingSession}
    >
      <StepShell>
        <SessionLabel />
        <CioCheckoutStep id="fulfill">
          <CioFulfillmentStep
            recreateSessionOnRetry
            onFulfill={() => {
              const next = attempt + 1;
              setAttempt(next);
              return delay<CioFulfillmentResult>({
                success: next >= 2,
                message:
                  next >= 2
                    ? 'Charged on the new session'
                    : 'Charge failed. The session is used up.',
              });
            }}
          />
        </CioCheckoutStep>
        <CioCheckoutStep id="done">
          <div style={{ padding: 12, background: '#e8f6ee', borderRadius: 6 }}>
            <strong>Done</strong>
          </div>
        </CioCheckoutStep>
      </StepShell>
    </CioCheckoutProvider>
  );
}

export const RecreateSessionOnRetry: Story = {
  name: 'Retry with a fresh session',
  parameters: {
    docs: {
      description: {
        story:
          'With `recreateSessionOnRetry`, Retry creates a new session before running `onFulfill` again. Watch the session id change.',
      },
    },
  },
  render: () => <RecreateDemo />,
};

export const CustomLabels: Story = {
  name: 'Custom labels',
  parameters: {
    docs: {
      description: {
        story: 'Labels come from `translations`.',
      },
    },
  },
  render: () => (
    <CioCheckoutProvider
      provider="stripe"
      steps={[{ id: 'fulfill' }]}
      onCreateSession={stubSession}
    >
      <StepShell>
        <CioCheckoutStep id="fulfill">
          <CioFulfillmentStep
            onFulfill={() => delay<CioFulfillmentResult>({ success: false })}
            translations={{
              'CioCheckout.fulfillment.pendingLabel': 'Checking your order...',
              'CioCheckout.fulfillment.failedLabel': 'We could not confirm it.',
              'CioCheckout.fulfillment.retryLabel': 'Check again',
            }}
          />
        </CioCheckoutStep>
      </StepShell>
    </CioCheckoutProvider>
  ),
};
