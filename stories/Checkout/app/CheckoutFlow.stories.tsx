import { useMemo, useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react';

import { CheckoutFlowStep } from '@src/app/components/CheckoutFlowStep';
import { CheckoutStripeStep } from '@src/app/components/CheckoutStripeStep';
import { useCheckoutFlow } from '@src/app/hooks/useCheckoutFlow';
import { CheckoutFlowProvider } from '@src/app/providers/CheckoutFlowProvider';
import type { RouterAdapter } from '@src/core/types';
import { CREATE_SESSION_STEP, STRIPE_STEP } from '@src/core/types';

const stubSession = () =>
  Promise.resolve({
    clientSecret: 'cs_test_DEMO_secret_xyz',
    publishableKey: 'pk_test_DEMO',
  });

const meta: Meta<typeof CheckoutFlowProvider> = {
  title: 'Components/CheckoutFlow',
  component: CheckoutFlowProvider,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof CheckoutFlowProvider>;

function DemoStatus() {
  const flow = useCheckoutFlow();
  return (
    <div style={{ padding: 16, background: '#f6f6f6', borderRadius: 6 }}>
      <p style={{ margin: 0, fontSize: 13, opacity: 0.7 }}>
        Live Stripe rendering needs a real backend session — see the code sample
        in the <strong>Docs</strong> tab.
      </p>
      <p style={{ margin: '8px 0 0', fontSize: 13 }}>
        Current step: <strong>{flow.state.currentStepId ?? 'idle'}</strong>
        {' · '}
        Session: <strong>{flow.state.sessionStatus}</strong>
      </p>
      {flow.state.currentStepId === null && (
        <button
          type="button"
          onClick={() => void flow.start()}
          style={{ marginTop: 8 }}
        >
          Start
        </button>
      )}
    </div>
  );
}

export const Basic: Story = {
  name: 'Basic (single-step Stripe)',
  parameters: {
    docs: {
      source: {
        language: 'tsx',
        code: `import {
  CheckoutFlowProvider,
  CheckoutFlowStep,
  CheckoutStripeStep,
  CREATE_SESSION_STEP,
  STRIPE_STEP,
} from '@constructor-io/constructorio-ui-checkout';

<CheckoutFlowProvider
  steps={[{ id: CREATE_SESSION_STEP }, { id: STRIPE_STEP }]}
  onCreateSession={() =>
    fetch('/api/checkout-session', { method: 'POST' }).then((r) => r.json())
  }
  autoStart
>
  <CheckoutFlowStep id={STRIPE_STEP}>
    <CheckoutStripeStep />
  </CheckoutFlowStep>
</CheckoutFlowProvider>`,
      },
    },
  },
  render: () => (
    <CheckoutFlowProvider
      steps={[{ id: CREATE_SESSION_STEP }, { id: STRIPE_STEP }]}
      onCreateSession={stubSession}
      autoStart
    >
      <DemoStatus />
      <CheckoutFlowStep id={STRIPE_STEP}>
        <CheckoutStripeStep />
      </CheckoutFlowStep>
    </CheckoutFlowProvider>
  ),
};

export const MultiStep: Story = {
  name: 'Multi-step wizard',
  parameters: {
    docs: {
      source: {
        language: 'tsx',
        code: `import {
  CheckoutFlowProvider,
  CheckoutFlowStep,
  CheckoutStripeStep,
  CheckoutFulfillmentStep,
  CREATE_SESSION_STEP,
  STRIPE_STEP,
  useCheckoutFlow,
} from '@constructor-io/constructorio-ui-checkout';

<CheckoutFlowProvider
  steps={[
    { id: 'cart' },
    { id: 'address' },
    { id: CREATE_SESSION_STEP },
    { id: STRIPE_STEP },
    { id: 'fulfill' },
    { id: 'done' },
  ]}
  onCreateSession={createSession}
>
  <StartButton />
  <CheckoutFlowStep id="cart"><YourCartView /></CheckoutFlowStep>
  <CheckoutFlowStep id="address"><YourAddressForm /></CheckoutFlowStep>
  <CheckoutFlowStep id={STRIPE_STEP}>
    <CheckoutStripeStep />
  </CheckoutFlowStep>
  <CheckoutFlowStep id="fulfill">
    <CheckoutFulfillmentStep onFulfill={verifyOrder} />
  </CheckoutFlowStep>
  <CheckoutFlowStep id="done"><YourConfirmation /></CheckoutFlowStep>
</CheckoutFlowProvider>

function StartButton() {
  const flow = useCheckoutFlow();
  if (flow.state.currentStepId !== null) return null;
  return <button onClick={() => flow.start()}>Checkout</button>;
}`,
      },
    },
  },
  render: () => (
    <CheckoutFlowProvider
      steps={[
        { id: 'cart' },
        { id: 'address' },
        { id: CREATE_SESSION_STEP },
        { id: STRIPE_STEP },
        { id: 'fulfill' },
        { id: 'done' },
      ]}
      onCreateSession={stubSession}
    >
      <DemoStatus />
      <CheckoutFlowStep id={STRIPE_STEP}>
        <CheckoutStripeStep />
      </CheckoutFlowStep>
    </CheckoutFlowProvider>
  ),
};

function RoutedDemo() {
  const [path, setPath] = useState('/cart');
  const router: RouterAdapter = useMemo(
    () => ({ push: setPath, getCurrentPath: () => path }),
    [path]
  );
  return (
    <CheckoutFlowProvider
      steps={[
        { id: 'cart', path: '/cart' },
        { id: 'address', path: '/checkout/address' },
        { id: STRIPE_STEP, path: '/checkout/payment' },
        { id: 'done', path: '/order/confirmed' },
      ]}
      onCreateSession={stubSession}
      router={router}
      autoStart
    >
      <div style={{ marginBottom: 8, opacity: 0.6 }}>
        URL: <code>{path}</code>
      </div>
      <DemoStatus />
      <CheckoutFlowStep id={STRIPE_STEP}>
        <CheckoutStripeStep />
      </CheckoutFlowStep>
    </CheckoutFlowProvider>
  );
}

export const RoutedMultiStep: Story = {
  name: 'Routed multi-step (URL-synced)',
  parameters: {
    docs: {
      source: {
        language: 'tsx',
        code: `import {
  CheckoutFlowProvider,
  CheckoutFlowStep,
  CheckoutStripeStep,
  STRIPE_STEP,
} from '@constructor-io/constructorio-ui-checkout';
import type { RouterAdapter } from '@constructor-io/constructorio-ui-checkout';

// Adapt your router (react-router, next/router, etc.) to RouterAdapter.
const router: RouterAdapter = {
  push: (path) => navigate(path),
  getCurrentPath: () => location.pathname,
  subscribe: (cb) => subscribeToLocationChanges(cb),
};

<CheckoutFlowProvider
  steps={[
    { id: 'cart', path: '/cart' },
    { id: 'address', path: '/checkout/address' },
    { id: STRIPE_STEP, path: '/checkout/payment' },
    { id: 'done', path: '/order/confirmed' },
  ]}
  onCreateSession={createSession}
  router={router}
  autoStart
>
  <CheckoutFlowStep id="cart"><YourCartView /></CheckoutFlowStep>
  <CheckoutFlowStep id="address"><YourAddressForm /></CheckoutFlowStep>
  <CheckoutFlowStep id={STRIPE_STEP}>
    <CheckoutStripeStep />
  </CheckoutFlowStep>
  <CheckoutFlowStep id="done"><YourConfirmation /></CheckoutFlowStep>
</CheckoutFlowProvider>`,
      },
    },
  },
  render: () => <RoutedDemo />,
};
