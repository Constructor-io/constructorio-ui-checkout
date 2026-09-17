import { useMemo, useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react';

import { CheckoutFlowStep } from '@src/app/components/CheckoutFlowStep';
import { CheckoutStripeStep } from '@src/app/components/CheckoutStripeStep';
import { useCheckoutFlow } from '@src/app/hooks/useCheckoutFlow';
import { CheckoutFlowProvider } from '@src/app/providers/CheckoutFlowProvider';
import type { RouterAdapter } from '@src/core/types';
import { STRIPE_STEP } from '@src/core/types';

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
          onClick={async () => { await flow.start(); }}
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
  STRIPE_STEP,
} from '@constructor-io/constructorio-ui-checkout';

<CheckoutFlowProvider
  steps={[{ id: STRIPE_STEP }]}
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
      steps={[{ id: STRIPE_STEP }]}
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
  STRIPE_STEP,
  useCheckoutFlow,
} from '@constructor-io/constructorio-ui-checkout';

<CheckoutFlowProvider
  steps={[
    { id: 'cart' },
    { id: 'address' },
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

const demoCart = [{ name: 'Widget', amount: 20, quantity: 1 }];
const getCart = () => demoCart;
const getAuthToken = () => 'demo-token';

function RealisticFlowDemo() {
  const [path, setPath] = useState('/cart');
  const [signedIn, setSignedIn] = useState(false);
  const router: RouterAdapter = useMemo(
    () => ({ push: setPath, getCurrentPath: () => path }),
    [path]
  );

  const createSession = () => {
    getAuthToken();
    getCart();
    return Promise.resolve({
      clientSecret: 'cs_test_DEMO_secret_xyz',
      publishableKey: 'pk_test_DEMO',
    });
  };

  return (
    <CheckoutFlowProvider
      steps={[
        { id: 'cart', path: '/cart' },
        { id: 'auth', guard: () => Promise.resolve(signedIn) },
        { id: 'shipping', path: '/checkout/shipping' },
        { id: STRIPE_STEP, path: '/checkout/payment' },
        { id: 'done', path: '/order/confirmed' },
      ]}
      onCreateSession={createSession}
      router={router}
      autoStart
    >
      <div style={{ marginBottom: 8, opacity: 0.6 }}>
        URL: <code>{path}</code>
      </div>
      <DemoStatus />

      <CheckoutFlowStep id="cart">
        <div
          style={{
            marginTop: 12,
            padding: 12,
            border: '1px solid #ddd',
            borderRadius: 6,
          }}
        >
          <strong>Cart</strong> (routed at /cart)
          <p>Widget × 1 — $20</p>
          <NextButton label="Continue to sign in" />
        </div>
      </CheckoutFlowStep>

      <CheckoutFlowStep id="auth">
        <div
          style={{
            marginTop: 12,
            padding: 16,
            background: '#fff8dc',
            border: '1px solid #d4a017',
            borderRadius: 6,
          }}
        >
          <strong>Sign in</strong> (modal, no route)
          <p style={{ fontSize: 13, opacity: 0.7 }}>
            No path — stays on {path}. Advances only when the guard passes.
          </p>
          {!signedIn ? (
            <button type="button" onClick={() => setSignedIn(true)}>
              Sign in
            </button>
          ) : (
            <NextButton label="Continue to shipping" />
          )}
        </div>
      </CheckoutFlowStep>

      <CheckoutFlowStep id="shipping">
        <div
          style={{
            marginTop: 12,
            padding: 12,
            border: '1px solid #ddd',
            borderRadius: 6,
          }}
        >
          <strong>Shipping</strong> (routed at /checkout/shipping)
          <NextButton label="Continue to payment" />
        </div>
      </CheckoutFlowStep>

      <CheckoutFlowStep id={STRIPE_STEP}>
        <div style={{ marginTop: 12 }}>
          <strong>Payment</strong> (routed at /checkout/payment)
          <CheckoutStripeStep />
        </div>
      </CheckoutFlowStep>

      <CheckoutFlowStep id="done">
        <div
          style={{
            marginTop: 12,
            padding: 12,
            background: '#e8f6ee',
            borderRadius: 6,
          }}
        >
          <strong>Confirmed</strong> (routed at /order/confirmed)
        </div>
      </CheckoutFlowStep>
    </CheckoutFlowProvider>
  );
}

function NextButton({ label }: { label: string }) {
  const flow = useCheckoutFlow();
  return (
    <button
      type="button"
      style={{ marginTop: 8 }}
      onClick={async () => {
        await flow.next();
      }}
    >
      {label}
    </button>
  );
}

export const RealisticMixedFlow: Story = {
  name: 'Realistic flow (routed + modal, with cart/auth)',
  parameters: {
    docs: {
      source: {
        language: 'tsx',
        code: `import {
  CheckoutFlowProvider,
  CheckoutFlowStep,
  CheckoutStripeStep,
  STRIPE_STEP,
  useCheckoutFlow,
} from '@constructor-io/constructorio-ui-checkout';
import type { RouterAdapter } from '@constructor-io/constructorio-ui-checkout';

import { getCart } from './lib/cart';        // plain function, module-scoped
import { getAuthToken } from './lib/auth';   // plain function, module-scoped
import { useAppRouter } from './hooks/useAppRouter';

function CheckoutApp() {
  const router: RouterAdapter = useAppRouter();
  const [signedIn, setSignedIn] = useState(false);

  // Reads cart + auth via plain functions at call time.
  // Provider is at the app root; callbacks proxy through propsRef,
  // so a fresh reference each render is fine.
  const createSession = () =>
    fetch('/api/checkout/session', {
      method: 'POST',
      headers: { Authorization: \`Bearer \${getAuthToken()}\` },
      body: JSON.stringify({ items: getCart() }),
    }).then((r) => r.json());

  return (
    <CheckoutFlowProvider
      steps={[
        { id: 'cart', path: '/cart' },                       // routed
        { id: 'auth', guard: () => Promise.resolve(signedIn) }, // modal
        { id: 'shipping', path: '/checkout/shipping' },      // routed
        { id: STRIPE_STEP, path: '/checkout/payment' },      // routed
        { id: 'done', path: '/order/confirmed' },            // routed
      ]}
      onCreateSession={createSession}
      router={router}
      autoStart
    >
      <CheckoutFlowStep id="cart"><CartView /></CheckoutFlowStep>

      {/* No path — this step stays over whatever route is current
          (typically /cart). Guard blocks advance until signedIn. */}
      <CheckoutFlowStep id="auth">
        <SignInModal onSignedIn={() => setSignedIn(true)} />
      </CheckoutFlowStep>

      <CheckoutFlowStep id="shipping"><ShippingForm /></CheckoutFlowStep>
      <CheckoutFlowStep id={STRIPE_STEP}>
        <CheckoutStripeStep />
      </CheckoutFlowStep>
      <CheckoutFlowStep id="done"><OrderConfirmation /></CheckoutFlowStep>
    </CheckoutFlowProvider>
  );
}`,
      },
    },
  },
  render: () => <RealisticFlowDemo />,
};
