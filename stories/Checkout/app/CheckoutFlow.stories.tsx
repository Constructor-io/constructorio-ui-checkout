import { useMemo, useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react';

import { CheckoutFlowStep } from '@src/app/components/CheckoutFlowStep';
import {
  CheckoutFulfillmentStep,
  type FulfillmentResult,
} from '@src/app/components/CheckoutFulfillmentStep';
import { CheckoutStripeStep } from '@src/app/components/CheckoutStripeStep';
import { useCheckoutFlow } from '@src/app/hooks/useCheckoutFlow';
import { CheckoutFlowProvider } from '@src/app/providers/CheckoutFlowProvider';
import { createSessionStorageAdapter } from '@src/core/storage/sessionStorageAdapter';
import type { CheckoutFlowConfig, RouterAdapter } from '@src/core/types';
import { CREATE_SESSION_STEP, STRIPE_STEP } from '@src/core/types';

const DEMO_PUBLISHABLE_KEY = 'pk_test_DEMO';
const DEMO_CLIENT_SECRET = 'cs_test_abc123_secret_xyz789';

const stubSession = () =>
  Promise.resolve({
    clientSecret: DEMO_CLIENT_SECRET,
    publishableKey: DEMO_PUBLISHABLE_KEY,
  });

const stubFulfill = (): Promise<FulfillmentResult> =>
  new Promise((resolve) => {
    setTimeout(
      () => resolve({ success: true, message: 'Order confirmed' }),
      500
    );
  });

const baseConfig: CheckoutFlowConfig = {
  steps: [
    { id: 'cart' },
    { id: 'address' },
    { id: CREATE_SESSION_STEP },
    { id: STRIPE_STEP },
    { id: 'fulfill' },
    { id: 'done' },
  ],
  onCreateSession: stubSession,
};

const meta: Meta<typeof CheckoutFlowProvider> = {
  title: 'Components/CheckoutFlow',
  component: CheckoutFlowProvider,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof CheckoutFlowProvider>;

function StepNav() {
  const flow = useCheckoutFlow();
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
      <button
        type="button"
        onClick={() => {
          void flow.back();
        }}
      >
        Back
      </button>
      <button
        type="button"
        onClick={() => {
          void flow.next();
        }}
      >
        Next
      </button>
      <span style={{ marginLeft: 12 }}>
        Step: <strong>{flow.state.currentStepId ?? '(not started)'}</strong>
      </span>
    </div>
  );
}

function StartButton() {
  const flow = useCheckoutFlow();
  if (flow.state.currentStepId !== null) return null;
  return (
    <button
      type="button"
      onClick={() => {
        void flow.start();
      }}
    >
      Start checkout
    </button>
  );
}

function ModalCheckout({ children }: { children: React.ReactNode }) {
  const flow = useCheckoutFlow();
  if (flow.state.currentStepId === null) return null;
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 100,
      }}
    >
      <div
        style={{
          background: 'white',
          padding: 24,
          minWidth: 400,
          borderRadius: 8,
        }}
      >
        {children}
      </div>
    </div>
  );
}

export const MultiStepWizard: Story = {
  name: 'Multi-step (components only, no routing)',
  render: () => (
    <CheckoutFlowProvider {...baseConfig}>
      <StartButton />
      <StepNav />
      <CheckoutFlowStep id="cart">
        <p>Cart contents shown here (integrator-owned view).</p>
      </CheckoutFlowStep>
      <CheckoutFlowStep id="address">
        <p>Address form shown here (integrator-owned view).</p>
      </CheckoutFlowStep>
      <CheckoutFlowStep id={CREATE_SESSION_STEP}>
        <p>Preparing your session…</p>
      </CheckoutFlowStep>
      <CheckoutFlowStep id={STRIPE_STEP}>
        <CheckoutStripeStep />
      </CheckoutFlowStep>
      <CheckoutFlowStep id="fulfill">
        <CheckoutFulfillmentStep onFulfill={stubFulfill} />
      </CheckoutFlowStep>
      <CheckoutFlowStep id="done">
        <p>All done! Order confirmed.</p>
      </CheckoutFlowStep>
    </CheckoutFlowProvider>
  ),
};

export const ExpressBuyNow: Story = {
  name: 'Express Buy Now (modal, no routing)',
  render: () => (
    <CheckoutFlowProvider
      steps={[{ id: CREATE_SESSION_STEP }, { id: STRIPE_STEP }, { id: 'done' }]}
      onCreateSession={stubSession}
    >
      <StartButton />
      <ModalCheckout>
        <StepNav />
        <CheckoutFlowStep id={STRIPE_STEP}>
          <CheckoutStripeStep />
        </CheckoutFlowStep>
        <CheckoutFlowStep id="done">
          <p>Purchase complete!</p>
        </CheckoutFlowStep>
      </ModalCheckout>
    </CheckoutFlowProvider>
  ),
};

export const GuestCheckout: Story = {
  name: 'Guest checkout (no login)',
  render: () => (
    <CheckoutFlowProvider
      steps={[{ id: 'cart' }, { id: STRIPE_STEP }]}
      onCreateSession={stubSession}
    >
      <StartButton />
      <StepNav />
      <CheckoutFlowStep id="cart">
        <p>No login step — customers proceed straight from cart to payment.</p>
      </CheckoutFlowStep>
      <CheckoutFlowStep id={STRIPE_STEP}>
        <CheckoutStripeStep />
      </CheckoutFlowStep>
    </CheckoutFlowProvider>
  ),
};

function WithLoginHarness() {
  const [signedIn, setSignedIn] = useState(false);
  return (
    <CheckoutFlowProvider
      steps={[
        { id: 'cart' },
        { id: 'auth' },
        {
          id: STRIPE_STEP,
          guard: () => Promise.resolve(signedIn),
        },
      ]}
      onCreateSession={stubSession}
    >
      <StartButton />
      <StepNav />
      <CheckoutFlowStep id="cart">Cart view</CheckoutFlowStep>
      <CheckoutFlowStep id="auth">
        <div style={{ padding: 12, border: '1px solid #ccc' }}>
          <p>Sign in to continue</p>
          <input placeholder="email" defaultValue="you@example.com" />
          <input
            placeholder="password"
            type="password"
            defaultValue="hunter2"
          />
          <button
            type="button"
            style={{ marginLeft: 8 }}
            onClick={() => setSignedIn(true)}
            disabled={signedIn}
          >
            {signedIn ? '✓ Signed in' : 'Sign in'}
          </button>
        </div>
      </CheckoutFlowStep>
      <CheckoutFlowStep id={STRIPE_STEP}>
        <CheckoutStripeStep />
      </CheckoutFlowStep>
    </CheckoutFlowProvider>
  );
}

export const WithLogin: Story = {
  name: 'Multi-step with login step (guard blocks advance)',
  render: () => <WithLoginHarness />,
};

function MockRouter({ children }: { children: React.ReactNode }) {
  const [path, setPath] = useState('/cart');
  const router: RouterAdapter = useMemo(
    () => ({
      push: (p) => setPath(p),
      getCurrentPath: () => path,
    }),
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
      <div style={{ marginBottom: 16, opacity: 0.6 }}>
        URL: <code>{path}</code>
      </div>
      {children}
    </CheckoutFlowProvider>
  );
}

export const RoutedMultiStep: Story = {
  name: 'Multi-step (routes only, URL-synced)',
  render: () => (
    <MockRouter>
      <StepNav />
      <CheckoutFlowStep id="cart">Cart at /cart</CheckoutFlowStep>
      <CheckoutFlowStep id="address">
        Address form at /checkout/address
      </CheckoutFlowStep>
      <CheckoutFlowStep id={STRIPE_STEP}>
        <CheckoutStripeStep />
      </CheckoutFlowStep>
      <CheckoutFlowStep id="done">
        Confirmation at /order/confirmed
      </CheckoutFlowStep>
    </MockRouter>
  ),
};

function PersistenceHarness() {
  const storage = useMemo(() => createSessionStorageAdapter(), []);
  return (
    <CheckoutFlowProvider
      {...baseConfig}
      storage={storage}
      storageKey="story-persistence-demo"
    >
      <p style={{ opacity: 0.7 }}>
        Reload the page — the flow resumes at the last step from sessionStorage.
      </p>
      <StartButton />
      <StepNav />
      <CheckoutFlowStep id="cart">Cart view</CheckoutFlowStep>
      <CheckoutFlowStep id="address">Address form</CheckoutFlowStep>
      <CheckoutFlowStep id={CREATE_SESSION_STEP}>
        Creating session…
      </CheckoutFlowStep>
      <CheckoutFlowStep id={STRIPE_STEP}>
        <CheckoutStripeStep />
      </CheckoutFlowStep>
      <CheckoutFlowStep id="fulfill">
        <CheckoutFulfillmentStep onFulfill={stubFulfill} />
      </CheckoutFlowStep>
      <CheckoutFlowStep id="done">All done!</CheckoutFlowStep>
    </CheckoutFlowProvider>
  );
}

export const PersistenceAndResume: Story = {
  name: 'Persistence + resume on reload',
  render: () => <PersistenceHarness />,
};
