import { PIA_WIRING } from "../shared/piaSnippet";

export const FULL_DESCRIPTION = `The classic multi-step routed checkout. Each step gets its own URL under /full/checkout/* so browser back/forward and deep-linking work naturally. CheckoutFlowState (current step, cart snapshot, integrator state) is persisted to sessionStorage via the built-in createSessionStorageAdapter(), so a mid-flow page refresh puts the user right back where they were with cart and address selections intact.`;

export const FULL_SNIPPET =
  PIA_WIRING +
  "\n\n" +
  `
// Full retail flow — recommendations → address → payment → complete.
// Each step has a path, so every advance changes the URL (deep-linkable +
// browser back friendly). CheckoutFlowState persists per-tab via sessionStorage.

import {
  CioCheckoutProvider,
  createSessionStorageAdapter,
} from '@constructor-io/constructorio-ui-checkout';

<CioCheckoutProvider
  provider='stripe'
  steps={[
    { id: 'recommendations', path: '/full/checkout/recommendations' },
    { id: 'address', path: '/full/checkout/address' },
    {
      id: 'payment',
      path: '/full/checkout/payment',
      // Guards only see CheckoutFlowState. Keep cart non-empty; enforce
      // address/shipping via the disabled "Continue" button in the address UI.
      guard: (s) => s.cartSnapshot.length > 0,
    },
    { id: 'complete', path: '/full/checkout/complete' },
  ]}
  router={{
    // Plug react-router into the flow so flow.next() pushes the URL.
    push: (path) => navigate(path),
    replace: (path) => navigate(path, { replace: true }),
    getCurrentPath: () => location.pathname,
    subscribe: (cb) => {
      const h = () => cb(location.pathname);
      addEventListener('popstate', h);
      return () => removeEventListener('popstate', h);
    },
  }}
  storage={createSessionStorageAdapter()}
  storageKey='cio-checkout::demo:full'
  storageAutoResume
  autoStart
  cart={cart.items.map(toCheckoutItem)}
  onCreateSession={async (state) => {
    // Called when the payment step mounts. Returns { clientSecret, publishableKey }
    // for Stripe.
    return api.createCheckoutSession({
      items: state.cartSnapshot,
      addressId: state.metadata.addressId,
      shippingId: state.metadata.shippingId,
    });
  }}
  onUpdateSession={async (patch) => {
    // Fires whenever we call flow.updateSession() — e.g., address change,
    // shipping change, item added mid-flow.
    return api.updateCheckoutSession({
      items: patch.items,
      addressId: patch.metadata?.addressId,
      shippingId: patch.metadata?.shippingId,
    });
  }}
  onEvent={(evt) => {
    // Discriminated union: flow.started, step.entered, session.created,
    // session.updated, session.expired, session.recreated, error, ...
    if (evt.type === 'error') console.error(evt.source, evt.error);
  }}>
  <Routes>
    <Route path='recommendations' element={<RecsStep />} />
    <Route path='address' element={<AddressStep />} />
    <Route path='payment' element={<PaymentStep />} />
    <Route path='complete' element={<CompleteStep />} />
  </Routes>
</CioCheckoutProvider>

// Each step wraps its body in <CioCheckoutStep id='...'> which only renders
// its children when state.currentStepId matches — this guards against the
// route element mounting before the flow has entered the step.
function PaymentStep() {
  return (
    <CioCheckoutStep id='payment'>
      <CioStripePaymentStep uiMode='elements' />
    </CioCheckoutStep>
  );
}
`;
