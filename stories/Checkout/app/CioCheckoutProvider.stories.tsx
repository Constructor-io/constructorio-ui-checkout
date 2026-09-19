import { useMemo, useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react';

import { CioCheckoutStep } from '@src/app/components/CioCheckoutStep';
import { CioStripePaymentStep } from '@src/app/components/CioStripePaymentStep';
import { useCioCheckout } from '@src/app/hooks/useCioCheckout';
import { CioCheckoutProvider } from '@src/app/providers/CioCheckoutProvider';
import type { RouterAdapter } from '@src/core/types';
import { PAYMENT_STEP } from '@src/core/types';

const stubSession = () =>
  Promise.resolve({
    clientSecret: 'cs_test_DEMO_secret_xyz',
    publishableKey: 'pk_test_DEMO',
  });

const meta: Meta<typeof CioCheckoutProvider> = {
  title: 'Components/CioCheckoutProvider',
  component: CioCheckoutProvider,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof CioCheckoutProvider>;

function DemoStatus() {
  const flow = useCioCheckout();
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
          onClick={() => {
            flow.start().catch(console.error);
          }}
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
  CioCheckoutProvider,
  CioCheckoutStep,
  CioStripePaymentStep,
  PAYMENT_STEP,
} from '@constructor-io/constructorio-ui-checkout';

<CioCheckoutProvider
  provider="stripe"
  steps={[{ id: PAYMENT_STEP }]}
  onCreateSession={() =>
    fetch('/api/checkout-session', { method: 'POST' }).then((r) => r.json())
  }
  autoStart
>
  <CioCheckoutStep id={PAYMENT_STEP}>
    <CioStripePaymentStep />
  </CioCheckoutStep>
</CioCheckoutProvider>`,
      },
    },
  },
  render: () => (
    <CioCheckoutProvider
      provider="stripe"
      steps={[{ id: PAYMENT_STEP }]}
      onCreateSession={stubSession}
      autoStart
    >
      <DemoStatus />
      <CioCheckoutStep id={PAYMENT_STEP}>
        <CioStripePaymentStep />
      </CioCheckoutStep>
    </CioCheckoutProvider>
  ),
};

export const MultiStep: Story = {
  name: 'Multi-step wizard',
  parameters: {
    docs: {
      source: {
        language: 'tsx',
        code: `import {
  CioCheckoutProvider,
  CioCheckoutStep,
  CioStripePaymentStep,
  CioFulfillmentStep,
  PAYMENT_STEP,
  useCioCheckout,
} from '@constructor-io/constructorio-ui-checkout';

<CioCheckoutProvider
  provider="stripe"
  steps={[
    { id: 'cart' },
    { id: 'address' },
    { id: PAYMENT_STEP },
    { id: 'fulfill' },
    { id: 'done' },
  ]}
  onCreateSession={createSession}
>
  <StartButton />
  <CioCheckoutStep id="cart"><YourCartView /></CioCheckoutStep>
  <CioCheckoutStep id="address"><YourAddressForm /></CioCheckoutStep>
  <CioCheckoutStep id={PAYMENT_STEP}>
    <CioStripePaymentStep />
  </CioCheckoutStep>
  <CioCheckoutStep id="fulfill">
    <CioFulfillmentStep onFulfill={verifyOrder} />
  </CioCheckoutStep>
  <CioCheckoutStep id="done"><YourConfirmation /></CioCheckoutStep>
</CioCheckoutProvider>

function StartButton() {
  const flow = useCioCheckout();
  if (flow.state.currentStepId !== null) return null;
  return <button onClick={() => flow.start()}>Checkout</button>;
}`,
      },
    },
  },
  render: () => (
    <CioCheckoutProvider
      provider="stripe"
      steps={[
        { id: 'cart' },
        { id: 'address' },
        { id: PAYMENT_STEP },
        { id: 'fulfill' },
        { id: 'done' },
      ]}
      onCreateSession={stubSession}
    >
      <DemoStatus />
      <CioCheckoutStep id={PAYMENT_STEP}>
        <CioStripePaymentStep />
      </CioCheckoutStep>
    </CioCheckoutProvider>
  ),
};

function RoutedDemo() {
  const [path, setPath] = useState('/cart');
  const router: RouterAdapter = useMemo(
    () => ({ push: setPath, getCurrentPath: () => path }),
    [path]
  );
  return (
    <CioCheckoutProvider
      provider="stripe"
      steps={[
        { id: 'cart', path: '/cart' },
        { id: 'address', path: '/checkout/address' },
        { id: PAYMENT_STEP, path: '/checkout/payment' },
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
      <CioCheckoutStep id={PAYMENT_STEP}>
        <CioStripePaymentStep />
      </CioCheckoutStep>
    </CioCheckoutProvider>
  );
}

export const RoutedMultiStep: Story = {
  name: 'Routed multi-step (URL-synced)',
  parameters: {
    docs: {
      source: {
        language: 'tsx',
        code: `import {
  CioCheckoutProvider,
  CioCheckoutStep,
  CioStripePaymentStep,
  PAYMENT_STEP,
} from '@constructor-io/constructorio-ui-checkout';
import type { RouterAdapter } from '@constructor-io/constructorio-ui-checkout';

// Adapt your router (react-router, next/router, etc.) to RouterAdapter.
const router: RouterAdapter = {
  push: (path) => navigate(path),
  getCurrentPath: () => location.pathname,
  subscribe: (cb) => subscribeToLocationChanges(cb),
};

<CioCheckoutProvider
  provider="stripe"
  steps={[
    { id: 'cart', path: '/cart' },
    { id: 'address', path: '/checkout/address' },
    { id: PAYMENT_STEP, path: '/checkout/payment' },
    { id: 'done', path: '/order/confirmed' },
  ]}
  onCreateSession={createSession}
  router={router}
  autoStart
>
  <CioCheckoutStep id="cart"><YourCartView /></CioCheckoutStep>
  <CioCheckoutStep id="address"><YourAddressForm /></CioCheckoutStep>
  <CioCheckoutStep id={PAYMENT_STEP}>
    <CioStripePaymentStep />
  </CioCheckoutStep>
  <CioCheckoutStep id="done"><YourConfirmation /></CioCheckoutStep>
</CioCheckoutProvider>`,
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
    <CioCheckoutProvider
      provider="stripe"
      steps={[
        { id: 'cart', path: '/cart' },
        { id: 'auth', guard: () => Promise.resolve(signedIn) },
        { id: 'shipping', path: '/checkout/shipping' },
        { id: PAYMENT_STEP, path: '/checkout/payment' },
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

      <CioCheckoutStep id="cart">
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
      </CioCheckoutStep>

      <CioCheckoutStep id="auth">
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
      </CioCheckoutStep>

      <CioCheckoutStep id="shipping">
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
      </CioCheckoutStep>

      <CioCheckoutStep id={PAYMENT_STEP}>
        <div style={{ marginTop: 12 }}>
          <strong>Payment</strong> (routed at /checkout/payment)
          <CioStripePaymentStep />
        </div>
      </CioCheckoutStep>

      <CioCheckoutStep id="done">
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
      </CioCheckoutStep>
    </CioCheckoutProvider>
  );
}

function NextButton({ label }: { label: string }) {
  const flow = useCioCheckout();
  return (
    <button
      type="button"
      style={{ marginTop: 8 }}
      onClick={() => {
        flow.next().catch(console.error);
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
  CioCheckoutProvider,
  CioCheckoutStep,
  CioStripePaymentStep,
  PAYMENT_STEP,
  useCioCheckout,
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
    <CioCheckoutProvider
      provider="stripe"
      steps={[
        { id: 'cart', path: '/cart' },                       // routed
        { id: 'auth', guard: () => Promise.resolve(signedIn) }, // modal
        { id: 'shipping', path: '/checkout/shipping' },      // routed
        { id: PAYMENT_STEP, path: '/checkout/payment' },      // routed
        { id: 'done', path: '/order/confirmed' },            // routed
      ]}
      onCreateSession={createSession}
      router={router}
      autoStart
    >
      <CioCheckoutStep id="cart"><CartView /></CioCheckoutStep>

      {/* No path — this step stays over whatever route is current
          (typically /cart). Guard blocks advance until signedIn. */}
      <CioCheckoutStep id="auth">
        <SignInModal onSignedIn={() => setSignedIn(true)} />
      </CioCheckoutStep>

      <CioCheckoutStep id="shipping"><ShippingForm /></CioCheckoutStep>
      <CioCheckoutStep id={PAYMENT_STEP}>
        <CioStripePaymentStep />
      </CioCheckoutStep>
      <CioCheckoutStep id="done"><OrderConfirmation /></CioCheckoutStep>
    </CioCheckoutProvider>
  );
}`,
      },
    },
  },
  render: () => <RealisticFlowDemo />,
};
