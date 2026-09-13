import { useEffect, useMemo, useRef, useState } from 'react';

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
import type {
  CheckoutEvent,
  CheckoutFlowConfig,
  FlowState,
  RouterAdapter,
  StorageAdapter,
} from '@src/core/types';
import { CREATE_SESSION_STEP, STRIPE_STEP } from '@src/core/types';
import type { CheckoutItem } from '@src/types';

const DEMO_PUBLISHABLE_KEY = 'pk_test_DEMO';

let sessionCounter = 0;
const makeSession = () => {
  sessionCounter += 1;
  const id = `cs_test_demo${sessionCounter}`;
  return {
    clientSecret: `${id}_secret_xyz`,
    publishableKey: DEMO_PUBLISHABLE_KEY,
  };
};

const stubSession = () => Promise.resolve(makeSession());

const baseConfig: CheckoutFlowConfig = {
  steps: [
    { id: CREATE_SESSION_STEP },
    { id: STRIPE_STEP },
    { id: 'fulfill' },
    { id: 'done' },
  ],
  onCreateSession: stubSession,
};

const meta: Meta<typeof CheckoutFlowProvider> = {
  title: 'Components/CheckoutFlow/Advanced',
  component: CheckoutFlowProvider,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof CheckoutFlowProvider>;

function StartButton({ label = 'Start checkout' }: { label?: string }) {
  const flow = useCheckoutFlow();
  if (flow.state.currentStepId !== null) return null;
  return (
    <button
      type="button"
      onClick={() => {
        void flow.start();
      }}
    >
      {label}
    </button>
  );
}

// -------- Elements mode --------

export const StripeElementsMode: Story = {
  name: 'Stripe surface: elements mode',
  render: () => (
    <CheckoutFlowProvider {...baseConfig}>
      <StartButton />
      <CheckoutFlowStep id={STRIPE_STEP}>
        <CheckoutStripeStep uiMode="elements" />
      </CheckoutFlowStep>
      <CheckoutFlowStep id="done">Purchase complete!</CheckoutFlowStep>
    </CheckoutFlowProvider>
  ),
};

// -------- Reactive cart sync --------

function ReactiveCartHarness() {
  const [cart, setCart] = useState<CheckoutItem[]>([
    { name: 'Widget', amount: 10, quantity: 1 },
  ]);

  const add = () =>
    setCart((c) => [
      ...c,
      { name: `Item ${c.length}`, amount: 5, quantity: 1 },
    ]);
  const clear = () => setCart([]);

  return (
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button type="button" onClick={add}>
          Add item
        </button>
        <button type="button" onClick={clear}>
          Clear
        </button>
      </div>
      <CheckoutFlowProvider
        {...baseConfig}
        cart={cart}
        cartDebounceMs={400}
        onUpdateSession={() => Promise.resolve(makeSession())}
      >
        <StartButton />
        <CartSnapshotView />
        <CheckoutFlowStep id={STRIPE_STEP}>
          <CheckoutStripeStep />
        </CheckoutFlowStep>
      </CheckoutFlowProvider>
    </>
  );
}

function CartSnapshotView() {
  const flow = useCheckoutFlow();
  return (
    <pre style={{ background: '#f6f6f6', padding: 8, fontSize: 12 }}>
      {JSON.stringify(
        flow.state.cartSnapshot.map((i) => `${i.name} × ${i.quantity ?? 1}`),
        null,
        2
      )}
    </pre>
  );
}

export const ReactiveCartSync: Story = {
  name: 'Reactive cart prop (debounced auto-sync)',
  render: () => <ReactiveCartHarness />,
};

// -------- Add-on injected mid-flow (pia bridge pattern) --------

function AddOnHarness() {
  const flow = useCheckoutFlow();
  const addFromRec = () =>
    void flow.syncCart([
      ...flow.state.cartSnapshot,
      { name: 'Recommended add-on', amount: 12, quantity: 1 },
    ]);

  return (
    <>
      <p>
        Simulates a recommendation carousel (pia-style) firing add-to-cart while
        checkout is already open. syncCart() funnels through the updateSession
        queue so payment integrity is preserved even under rapid clicks.
      </p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => {
            void flow.start();
          }}
        >
          Open checkout
        </button>
        <button
          type="button"
          disabled={flow.state.sessionStatus !== 'active'}
          onClick={addFromRec}
        >
          Add recommended item
        </button>
      </div>
      <CartSnapshotView />
      <CheckoutFlowStep id={STRIPE_STEP}>
        <CheckoutStripeStep />
      </CheckoutFlowStep>
    </>
  );
}

export const AddOnMidFlow: Story = {
  name: 'Add-to-cart from recommendations mid-flow',
  render: () => (
    <CheckoutFlowProvider
      steps={[{ id: CREATE_SESSION_STEP }, { id: STRIPE_STEP }]}
      onCreateSession={stubSession}
      onUpdateSession={() => Promise.resolve(makeSession())}
      cart={[{ name: 'Existing item', amount: 20, quantity: 1 }]}
    >
      <AddOnHarness />
    </CheckoutFlowProvider>
  ),
};

// -------- Session expiry + recreate --------

function ExpiryHarness() {
  const flow = useCheckoutFlow();
  return (
    <>
      <p>
        Simulates Stripe reporting session expiry after ~2 seconds of idle.
        recreate() re-runs onCreateSession with the current state, giving buyers
        a fresh checkout without losing their cart.
      </p>
      <div style={{ marginBottom: 12 }}>
        Session status: <strong>{flow.state.sessionStatus}</strong>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => {
            void flow.createSession();
          }}
        >
          Create session
        </button>
        <button
          type="button"
          onClick={() => flow.markExpired()}
          disabled={flow.state.sessionStatus !== 'active'}
        >
          Simulate expiry
        </button>
        <button
          type="button"
          onClick={() => {
            void flow.recreate();
          }}
          disabled={flow.state.sessionStatus !== 'expired'}
        >
          Recreate
        </button>
      </div>
    </>
  );
}

export const SessionExpiryAndRecreate: Story = {
  name: 'Session expiry + recreate() recovery',
  render: () => (
    <CheckoutFlowProvider
      steps={[{ id: STRIPE_STEP }]}
      onCreateSession={stubSession}
    >
      <ExpiryHarness />
    </CheckoutFlowProvider>
  ),
};

// -------- Custom fulfillment render prop --------

const slowFulfill = (): Promise<FulfillmentResult> =>
  new Promise((resolve) => {
    setTimeout(
      () =>
        resolve({
          success: Math.random() > 0.3,
          message: 'Order #' + Math.floor(Math.random() * 10000),
        }),
      1200
    );
  });

export const CustomFulfillmentUI: Story = {
  name: 'Fulfillment with custom render prop',
  render: () => (
    <CheckoutFlowProvider
      steps={[{ id: 'fulfill' }, { id: 'done' }]}
      onCreateSession={stubSession}
      autoStart
    >
      <CheckoutFlowStep id="fulfill">
        <CheckoutFulfillmentStep
          onFulfill={slowFulfill}
          advanceOnSuccess={false}
          render={({ status, result, retry, advance }) => {
            if (status === 'pending') {
              return (
                <div
                  style={{
                    padding: 24,
                    border: '2px dashed #aaa',
                    borderRadius: 8,
                  }}
                >
                  ⏳ Verifying with our fulfillment partner…
                </div>
              );
            }
            if (status === 'fulfilled') {
              return (
                <div
                  style={{
                    padding: 24,
                    background: '#e8f6ee',
                    borderRadius: 8,
                  }}
                >
                  <p>✅ {result?.message}</p>
                  <button type="button" onClick={advance}>
                    View receipt
                  </button>
                </div>
              );
            }
            if (status === 'failed') {
              return (
                <div
                  style={{
                    padding: 24,
                    background: '#fdecea',
                    borderRadius: 8,
                  }}
                >
                  <p>❌ {result?.message}</p>
                  <button type="button" onClick={retry}>
                    Retry verification
                  </button>
                </div>
              );
            }
            return null;
          }}
        />
      </CheckoutFlowStep>
      <CheckoutFlowStep id="done">
        <p>Thanks — receipt on the way.</p>
      </CheckoutFlowStep>
    </CheckoutFlowProvider>
  ),
};

// -------- Analytics via onEvent --------

function EventLog() {
  const [events, setEvents] = useState<CheckoutEvent[]>([]);
  const eventsRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (eventsRef.current) eventsRef.current.scrollTop = 0;
  }, [events]);

  const onEvent = (e: CheckoutEvent) =>
    setEvents((prev) => [e, ...prev].slice(0, 20));

  return (
    <>
      <p>
        Drive the flow with the buttons — the event log below records every
        onEvent call in reverse-chronological order.
      </p>
      <CheckoutFlowProvider
        steps={[{ id: 'cart' }, { id: STRIPE_STEP }, { id: 'done' }]}
        onCreateSession={stubSession}
        onEvent={onEvent}
      >
        <StartButton label="Open" />
        <TrackingControls />
        <CheckoutFlowStep id="cart">Cart step</CheckoutFlowStep>
        <CheckoutFlowStep id={STRIPE_STEP}>
          <CheckoutStripeStep />
        </CheckoutFlowStep>
        <CheckoutFlowStep id="done">Done!</CheckoutFlowStep>
      </CheckoutFlowProvider>
      <pre
        ref={eventsRef}
        style={{
          maxHeight: 260,
          overflow: 'auto',
          background: '#111',
          color: '#0f0',
          padding: 12,
          marginTop: 12,
          fontSize: 11,
        }}
      >
        {events
          .map((e, i) => `${events.length - i}. ${JSON.stringify(e)}`)
          .join('\n')}
      </pre>
    </>
  );
}

function TrackingControls() {
  const flow = useCheckoutFlow();
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
      <button type="button" onClick={() => void flow.next()}>
        next
      </button>
      <button type="button" onClick={() => void flow.back()}>
        back
      </button>
      <button type="button" onClick={() => flow.reset()}>
        reset
      </button>
    </div>
  );
}

export const AnalyticsTracking: Story = {
  name: 'Analytics via onEvent',
  render: () => <EventLog />,
};

// -------- Custom backend storage adapter (B2B / multi-device) --------

const inMemoryBackend = new Map<string, FlowState>();

function createBackendStorageAdapter(latencyMs = 300): StorageAdapter {
  return {
    load: (key) =>
      new Promise((resolve) => {
        setTimeout(() => resolve(inMemoryBackend.get(key) ?? null), latencyMs);
      }),
    save: (key, state) =>
      new Promise((resolve) => {
        setTimeout(() => {
          inMemoryBackend.set(key, state);
          resolve();
        }, latencyMs);
      }),
    clear: (key) =>
      new Promise((resolve) => {
        setTimeout(() => {
          inMemoryBackend.delete(key);
          resolve();
        }, latencyMs);
      }),
  };
}

function BackendAdapterHarness() {
  const storage = useMemo(() => createBackendStorageAdapter(200), []);
  return (
    <CheckoutFlowProvider
      steps={[{ id: 'cart' }, { id: 'approval' }, { id: STRIPE_STEP }]}
      onCreateSession={stubSession}
      storage={storage}
      storageKey="b2b-order-123"
    >
      <p>
        Simulates a B2B flow where a buyer pauses at the "approval" step and an
        approver resumes days later on a different device. State is stored via
        an async adapter (mocked backend with 200ms latency).
      </p>
      <StartButton />
      <BackendControls />
      <CheckoutFlowStep id="cart">Buyer builds the cart</CheckoutFlowStep>
      <CheckoutFlowStep id="approval">
        <p>⏸ Awaiting approver. Persisted to backend.</p>
      </CheckoutFlowStep>
      <CheckoutFlowStep id={STRIPE_STEP}>
        <CheckoutStripeStep />
      </CheckoutFlowStep>
    </CheckoutFlowProvider>
  );
}

function BackendControls() {
  const flow = useCheckoutFlow();
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
      <button type="button" onClick={() => void flow.next()}>
        Advance
      </button>
      <button type="button" onClick={() => void flow.back()}>
        Back
      </button>
      <button type="button" onClick={() => void flow.clearState()}>
        Clear (approver rejected)
      </button>
    </div>
  );
}

export const BackendStorageAdapter: Story = {
  name: 'Backend storage adapter (B2B / multi-device)',
  render: () => <BackendAdapterHarness />,
};

// -------- Mixed routed + modal steps --------

function MixedRoutedHarness() {
  const [path, setPath] = useState('/cart');
  const [modalOpen, setModalOpen] = useState(false);
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
        { id: 'auth' },
        { id: STRIPE_STEP, path: '/checkout/payment' },
      ]}
      onCreateSession={stubSession}
      router={router}
      autoStart
    >
      <div style={{ marginBottom: 12, opacity: 0.6 }}>
        URL: <code>{path}</code>
      </div>
      <MixedControls modalOpen={modalOpen} setModalOpen={setModalOpen} />
      <CheckoutFlowStep id="cart">
        Cart view (URL-routed at /cart)
      </CheckoutFlowStep>
      <CheckoutFlowStep id="auth">
        {modalOpen && (
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
            <div style={{ background: 'white', padding: 24, minWidth: 360 }}>
              <p>Login modal (no path — inline over cart URL)</p>
              <ModalNextButton onClose={() => setModalOpen(false)} />
            </div>
          </div>
        )}
      </CheckoutFlowStep>
      <CheckoutFlowStep id={STRIPE_STEP}>
        <p>Payment page (URL-routed at /checkout/payment)</p>
        <CheckoutStripeStep />
      </CheckoutFlowStep>
    </CheckoutFlowProvider>
  );
}

function MixedControls({
  modalOpen,
  setModalOpen,
}: {
  modalOpen: boolean;
  setModalOpen: (v: boolean) => void;
}) {
  const flow = useCheckoutFlow();
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
      <button
        type="button"
        onClick={() => {
          void flow.next();
          if (flow.state.currentStepId === 'cart') setModalOpen(true);
        }}
        disabled={modalOpen}
      >
        Next
      </button>
    </div>
  );
}

function ModalNextButton({ onClose }: { onClose: () => void }) {
  const flow = useCheckoutFlow();
  return (
    <button
      type="button"
      onClick={() => {
        void flow.next();
        onClose();
      }}
    >
      Sign in and continue
    </button>
  );
}

export const MixedRoutedAndModal: Story = {
  name: 'Mixed routed + inline modal steps',
  render: () => <MixedRoutedHarness />,
};

// -------- Direct-link resume (emailed abandoned-cart link) --------

function DirectLinkHarness() {
  const storage = useMemo(() => createSessionStorageAdapter(), []);
  const [hasSaved, setHasSaved] = useState(false);

  return (
    <>
      <p>
        Simulates the abandoned-cart-recovery pattern: a buyer partially fills
        the flow, closes the tab, then clicks an emailed link that lands them
        back on the payment step with everything hydrated.
      </p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => {
            setHasSaved(false);
            void storage.clear('email-resume-user-1');
          }}
        >
          Reset scenario
        </button>
        <button
          type="button"
          onClick={() => setHasSaved(true)}
          disabled={hasSaved}
        >
          Simulate email-link landing
        </button>
      </div>
      {!hasSaved ? (
        <SessionOne storage={storage} onSaved={() => setHasSaved(true)} />
      ) : (
        <SessionTwo storage={storage} />
      )}
    </>
  );
}

function SessionOne({
  storage,
  onSaved,
}: {
  storage: StorageAdapter;
  onSaved: () => void;
}) {
  return (
    <div style={{ padding: 12, border: '1px solid #ddd' }}>
      <h4>Session 1 — buyer starts checkout, then closes tab</h4>
      <CheckoutFlowProvider
        steps={[{ id: 'cart' }, { id: 'address' }, { id: STRIPE_STEP }]}
        onCreateSession={stubSession}
        storage={storage}
        storageKey="email-resume-user-1"
        storageSaveDebounceMs={0}
      >
        <StartButton />
        <FlowAdvanceControls />
        <button type="button" onClick={onSaved} style={{ marginTop: 8 }}>
          [Close tab — save & move to Session 2]
        </button>
      </CheckoutFlowProvider>
    </div>
  );
}

function SessionTwo({ storage }: { storage: StorageAdapter }) {
  return (
    <div style={{ padding: 12, border: '1px solid #4a4' }}>
      <h4>Session 2 — buyer clicks emailed resume link</h4>
      <CheckoutFlowProvider
        steps={[{ id: 'cart' }, { id: 'address' }, { id: STRIPE_STEP }]}
        onCreateSession={stubSession}
        storage={storage}
        storageKey="email-resume-user-1"
      >
        <StartButton label="Continue where I left off" />
        <FlowAdvanceControls />
      </CheckoutFlowProvider>
    </div>
  );
}

function FlowAdvanceControls() {
  const flow = useCheckoutFlow();
  return (
    <div style={{ marginTop: 8 }}>
      <div>Current step: {flow.state.currentStepId ?? '(not started)'}</div>
      <div>Completed: {flow.state.completedStepIds.join(', ') || 'none'}</div>
      <button type="button" onClick={() => void flow.next()}>
        Advance
      </button>
    </div>
  );
}

export const DirectLinkResume: Story = {
  name: 'Abandoned-cart resume via emailed link',
  render: () => <DirectLinkHarness />,
};

// -------- Multiple checkout instances (pia's checkoutProps[] pattern) --------

function BundleCard({ title, cart }: { title: string; cart: CheckoutItem[] }) {
  return (
    <CheckoutFlowProvider
      steps={[{ id: CREATE_SESSION_STEP }, { id: STRIPE_STEP }]}
      onCreateSession={stubSession}
      cart={cart}
    >
      <div
        style={{
          border: '1px solid #ccc',
          padding: 12,
          borderRadius: 6,
          minWidth: 260,
        }}
      >
        <h4 style={{ marginTop: 0 }}>{title}</h4>
        <ul>
          {cart.map((i) => (
            <li key={i.name}>
              {i.name} — ${i.amount}
            </li>
          ))}
        </ul>
        <StartButton label="Buy this bundle" />
        <CheckoutFlowStep id={STRIPE_STEP}>
          <CheckoutStripeStep />
        </CheckoutFlowStep>
      </div>
    </CheckoutFlowProvider>
  );
}

export const MultipleConcurrentInstances: Story = {
  name: 'Multiple checkout instances on one page',
  render: () => (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      <BundleCard
        title="Starter bundle"
        cart={[{ name: 'Widget', amount: 20 }]}
      />
      <BundleCard
        title="Pro bundle"
        cart={[
          { name: 'Widget', amount: 20 },
          { name: 'Pro upgrade', amount: 40 },
        ]}
      />
      <BundleCard
        title="Enterprise bundle"
        cart={[
          { name: 'Widget', amount: 20 },
          { name: 'Pro upgrade', amount: 40 },
          { name: 'SLA add-on', amount: 100 },
        ]}
      />
    </div>
  ),
};

// -------- Integrator state (cross-step context for triggerWhen-style gating) --------

function IntegratorStateHarness() {
  const flow = useCheckoutFlow<{ turns: number }>();
  const canOpen = flow.getIntegratorState().turns >= 3;

  return (
    <>
      <p>
        The old library gated the trigger via triggerWhen(state). Same idea now
        with setIntegratorState — you own it, and any component in the tree can
        read it via useCheckoutFlow().getIntegratorState().
      </p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button
          type="button"
          onClick={() =>
            flow.setIntegratorState((s) => ({ turns: s.turns + 1 }))
          }
        >
          Increment turn ({flow.getIntegratorState().turns})
        </button>
        <button
          type="button"
          disabled={!canOpen}
          onClick={() => {
            void flow.start();
          }}
        >
          {canOpen ? 'Open checkout' : 'Locked (need 3+ turns)'}
        </button>
      </div>
      <CheckoutFlowStep id={STRIPE_STEP}>
        <CheckoutStripeStep />
      </CheckoutFlowStep>
    </>
  );
}

export const IntegratorStateGating: Story = {
  name: 'Trigger gated on integrator state (triggerWhen equivalent)',
  render: () => (
    <CheckoutFlowProvider<{ turns: number }>
      steps={[{ id: STRIPE_STEP }]}
      onCreateSession={stubSession}
      initialState={{ turns: 0 }}
    >
      <IntegratorStateHarness />
    </CheckoutFlowProvider>
  ),
};

// -------- Skip an optional step --------

export const SkipOptionalStep: Story = {
  name: 'Skip an optional step',
  render: () => (
    <CheckoutFlowProvider
      steps={[
        { id: 'cart' },
        { id: 'add-warranty', optional: true },
        { id: STRIPE_STEP },
      ]}
      onCreateSession={stubSession}
    >
      <StartButton />
      <SkipControls />
      <CheckoutFlowStep id="cart">Cart</CheckoutFlowStep>
      <CheckoutFlowStep id="add-warranty">
        <p>Would you like to add a warranty? (optional)</p>
      </CheckoutFlowStep>
      <CheckoutFlowStep id={STRIPE_STEP}>
        <CheckoutStripeStep />
      </CheckoutFlowStep>
    </CheckoutFlowProvider>
  ),
};

function SkipControls() {
  const flow = useCheckoutFlow();
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
      <button type="button" onClick={() => void flow.next()}>
        Add warranty
      </button>
      <button type="button" onClick={() => void flow.next({ skip: true })}>
        No thanks (skip)
      </button>
    </div>
  );
}

// -------- Typed error events + retry --------

function ErrorRecoveryHarness() {
  const [attempts, setAttempts] = useState(0);
  const [lastError, setLastError] = useState<CheckoutEvent | null>(null);
  const onCreateSession = () => {
    setAttempts((n) => n + 1);
    if (attempts < 2) {
      return Promise.reject(new Error('Simulated 500 from checkout backend'));
    }
    return Promise.resolve(makeSession());
  };

  return (
    <CheckoutFlowProvider
      steps={[{ id: STRIPE_STEP }]}
      onCreateSession={onCreateSession}
      onEvent={(e) => {
        if (e.type === 'error') setLastError(e);
      }}
    >
      <StartButton label="Try to open (fails twice, then succeeds)" />
      <ErrorRecoveryPanel error={lastError} attempts={attempts} />
      <CheckoutFlowStep id={STRIPE_STEP}>
        <CheckoutStripeStep />
      </CheckoutFlowStep>
    </CheckoutFlowProvider>
  );
}

function ErrorRecoveryPanel({
  error,
  attempts,
}: {
  error: CheckoutEvent | null;
  attempts: number;
}) {
  const flow = useCheckoutFlow();
  if (!error || error.type !== 'error') return null;
  return (
    <div
      style={{
        marginTop: 12,
        padding: 12,
        background: '#fdecea',
        borderRadius: 6,
      }}
    >
      <div>
        <strong>Error source:</strong> {error.source}
      </div>
      <div>
        <strong>Message:</strong> {error.error.message}
      </div>
      <div>
        <strong>Attempts:</strong> {attempts}
      </div>
      <button
        type="button"
        onClick={() => {
          void flow.createSession();
        }}
      >
        Retry
      </button>
    </div>
  );
}

export const ErrorRecovery: Story = {
  name: 'Typed error events with retry',
  render: () => <ErrorRecoveryHarness />,
};

// -------- Fully custom Stripe surface (replacing CheckoutStripeStep) --------

function CustomStripePane() {
  const flow = useCheckoutFlow();
  const session = flow.getSession();

  useEffect(() => {
    if (!session && flow.state.sessionStatus === 'idle') {
      void flow.createSession();
    }
  }, [flow, session]);

  if (flow.state.sessionStatus === 'creating') {
    return <div>🎨 (Custom skeleton) preparing your session…</div>;
  }
  if (!session) return null;

  return (
    <div
      style={{
        padding: 16,
        border: '2px solid #6366f1',
        borderRadius: 8,
        background: '#f6f5ff',
      }}
    >
      <p style={{ margin: 0, fontWeight: 600 }}>Custom-branded checkout</p>
      <p style={{ marginTop: 4, fontSize: 12, opacity: 0.7 }}>
        Merchant renders their own Stripe integration using the session:
      </p>
      <code style={{ fontSize: 11 }}>
        session_id: {flow.state.sessionId ?? '—'}
      </code>
      <div style={{ marginTop: 12 }}>
        <button type="button" onClick={() => void flow.next()}>
          Simulate successful payment
        </button>
      </div>
    </div>
  );
}

export const CustomStripeSurface: Story = {
  name: 'Custom Stripe surface (bypass CheckoutStripeStep)',
  render: () => (
    <CheckoutFlowProvider
      steps={[{ id: STRIPE_STEP }, { id: 'done' }]}
      onCreateSession={stubSession}
      autoStart
    >
      <CheckoutFlowStep id={STRIPE_STEP}>
        <CustomStripePane />
      </CheckoutFlowStep>
      <CheckoutFlowStep id="done">
        <p>All done — your custom flow can render anything here.</p>
      </CheckoutFlowStep>
    </CheckoutFlowProvider>
  ),
};

// -------- Buy Now from a product card (cart injected per-click) --------

interface Product {
  id: string;
  name: string;
  amount: number;
}

const CATALOG: Product[] = [
  { id: 'p_1', name: 'Ergonomic keyboard', amount: 89 },
  { id: 'p_2', name: 'Standing desk mat', amount: 45 },
  { id: 'p_3', name: 'Monitor arm', amount: 120 },
];

function BuyNowCard({
  product,
  onBuy,
}: {
  product: Product;
  onBuy: (p: Product) => void;
}) {
  return (
    <div
      style={{
        border: '1px solid #ddd',
        padding: 12,
        borderRadius: 6,
        minWidth: 180,
      }}
    >
      <div style={{ fontWeight: 600 }}>{product.name}</div>
      <div style={{ opacity: 0.7, fontSize: 12 }}>${product.amount}</div>
      <button
        type="button"
        style={{ marginTop: 8 }}
        onClick={() => onBuy(product)}
      >
        Buy now
      </button>
    </div>
  );
}

function BuyNowHarness() {
  const [selected, setSelected] = useState<Product | null>(null);

  return (
    <>
      <p>
        Each product card starts a fresh single-item checkout for just that
        product — no shared cart. Common on product-detail pages and
        recommendation carousels.
      </p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {CATALOG.map((p) => (
          <BuyNowCard key={p.id} product={p} onBuy={setSelected} />
        ))}
      </div>
      {selected && (
        <div style={{ marginTop: 24 }}>
          <CheckoutFlowProvider
            key={selected.id}
            steps={[{ id: CREATE_SESSION_STEP }, { id: STRIPE_STEP }]}
            onCreateSession={stubSession}
            cart={[{ name: selected.name, amount: selected.amount }]}
            autoStart
          >
            <div style={{ marginBottom: 8 }}>
              Buying: <strong>{selected.name}</strong>{' '}
              <button
                type="button"
                onClick={() => setSelected(null)}
                style={{ marginLeft: 8 }}
              >
                Cancel
              </button>
            </div>
            <CheckoutFlowStep id={STRIPE_STEP}>
              <CheckoutStripeStep />
            </CheckoutFlowStep>
          </CheckoutFlowProvider>
        </div>
      )}
    </>
  );
}

export const BuyNowFromProduct: Story = {
  name: 'Buy Now from product card (cart per-click)',
  render: () => <BuyNowHarness />,
};

// -------- Reset & restart mid-flow --------

function ResetHarness() {
  const flow = useCheckoutFlow();
  return (
    <>
      <p>
        A support agent (or a "start over" button) can reset the flow at any
        moment. reset() clears state and returns the flow to its initial idle
        state.
      </p>
      <StartButton />
      <div style={{ display: 'flex', gap: 8, margin: '12px 0' }}>
        <button type="button" onClick={() => void flow.next()}>
          Advance
        </button>
        <button type="button" onClick={() => flow.reset()}>
          Start over
        </button>
      </div>
      <div>
        Current step: <strong>{flow.state.currentStepId ?? 'idle'}</strong>
      </div>
      <div>Completed: {flow.state.completedStepIds.join(', ') || 'none'}</div>
    </>
  );
}

export const ResetAndRestart: Story = {
  name: 'Reset & restart mid-flow',
  render: () => (
    <CheckoutFlowProvider
      steps={[
        { id: 'cart' },
        { id: 'address' },
        { id: STRIPE_STEP },
        { id: 'done' },
      ]}
      onCreateSession={stubSession}
    >
      <ResetHarness />
    </CheckoutFlowProvider>
  ),
};

// -------- Vanilla JS (imperative) — reference card --------

export const VanillaJSReference: Story = {
  name: 'Vanilla JS class (reference snippet)',
  render: () => (
    <div style={{ maxWidth: 720 }}>
      <p>
        The CheckoutFlow class is the imperative wrapper used from non-React
        apps and the standalone bundle. Same behavior as the React adapter,
        class-shaped surface.
      </p>
      <pre
        style={{
          background: '#111',
          color: '#e5e5e5',
          padding: 16,
          borderRadius: 6,
          fontSize: 12,
          lineHeight: 1.5,
        }}
      >{`import { CheckoutFlow, createSessionStorageAdapter }
  from '@constructor-io/constructorio-ui-checkout';

const flow = new CheckoutFlow({
  steps: [
    { id: 'cart', path: '/cart' },
    { id: 'createSession' },
    { id: 'stripe', path: '/checkout/payment' },
  ],
  onCreateSession: () =>
    fetch('/api/session').then((r) => r.json()),
  storage: createSessionStorageAdapter(),
  storageKey: 'user-123',
  router: {
    push: (path) => (window.location.href = path),
    getCurrentPath: () => window.location.pathname,
  },
  onEvent: (event) => console.log(event),
});

flow.subscribe((state) => renderMyUI(state));

await flow.start();
// user interacts...
await flow.next();
await flow.syncCart(newItems);

// on next page load, start() auto-hydrates from storage
`}</pre>
    </div>
  ),
};
