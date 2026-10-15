import { PIA_WIRING } from "../shared/piaSnippet";

export const ONEPAGE_DESCRIPTION = `Every UI section lives on a single route: cart summary, address picker, shipping picker, and the Stripe payment form all render on /one-page/checkout. The payment element is conditionally mounted — it only appears once cart + address + shipping are all set, so createSession is called with complete data and Stripe shows the correct total. Stripe's own Pay button drives the actual charge; on success the flow advances to the /complete step. A guard on the 'checkout' step keeps flow.start() off empty carts.`;

export const ONEPAGE_SNIPPET =
  PIA_WIRING +
  "\n\n" +
  `
// One-page flow — everything on /one-page/checkout, then /complete.
// Stripe payment element mounts only after all form fields are filled.

<CioCheckoutProvider
  provider='stripe'
  steps={[
    // The single checkout step — its body renders cart + form + payment.
    { id: 'checkout', guard: (s) => s.cartSnapshot.length > 0 },
    { id: 'complete' },
  ]}
  storage={createSessionStorageAdapter()}
  storageKey='cio-checkout::demo:one-page'
  storageAutoResume
  autoStart
  cart={cart.items.map(toCheckoutItem)}
  onCreateSession={buildSession}
  onUpdateSession={rebuildSession}>
  <CioCheckoutStep id='checkout'>
    <section>
      <Cart />
      <AddressPicker onChange={(a) => {
        flow.setIntegratorState((p) => ({ ...p, addressId: a.id }));
        // No flow.next() call — user stays on this step until Stripe confirms.
      }} />
      <ShippingPicker onChange={(r) => {
        flow.setIntegratorState((p) => ({ ...p, shippingId: r.id }));
      }} />

      {/* Conditionally mount Stripe. On mount, CioStripePaymentStep calls
          flow.createSession() which POSTs to your server with the current
          address + shipping + items. Its built-in Pay button drives the
          charge and advances the flow to 'complete' on success. */}
      {addressId && shippingId && cart.length > 0 && (
        <CioStripePaymentStep uiMode='elements' />
      )}
    </section>
  </CioCheckoutStep>

  <CioCheckoutStep id='complete'>
    <CioFulfillmentStep onFulfill={verifyOrder} />
  </CioCheckoutStep>
</CioCheckoutProvider>
`;
