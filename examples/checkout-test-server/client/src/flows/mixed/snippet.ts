import { PIA_WIRING } from "../shared/piaSnippet";

export const MIXED_DESCRIPTION = `Combines routed and inline step patterns in one Provider. /mixed/checkout/details holds two inline sub-steps (address, shipping) that advance currentStepId via flow.next() without changing the URL. The next three steps (gift, payment, complete) each get their own route. Use this when parts of your flow are naturally deep-linkable (payment, order confirmation) but intermediate collection steps aren't (address+shipping form).`;

export const MIXED_SNIPPET =
  PIA_WIRING +
  "\n\n" +
  `
// Mixed flow — steps with a 'path' are routed (URL changes on flow.next()),
// steps without one are inline (URL stays put).

<CioCheckoutProvider
  provider='stripe'
  steps={[
    { id: 'address',   path: '/mixed/checkout/details'  },  // routed
    { id: 'shipping'                                    },  // inline — same URL
    { id: 'gift-wrap', path: '/mixed/checkout/gift'     },  // routed
    { id: 'payment',   path: '/mixed/checkout/payment',
      guard: (s) => s.cartSnapshot.length > 0 },
    { id: 'complete',  path: '/mixed/checkout/complete' },  // routed
  ]}
  router={reactRouterAdapter}
  storage={createSessionStorageAdapter()}
  storageAutoResume
  autoStart
  onCreateSession={buildSession}
  onUpdateSession={rebuildSession}>
  <Routes>
    {/* Two inline sub-steps under one route.
        Each <CioCheckoutStep> only renders when currentStepId matches, so
        address hides when the flow advances to shipping — same URL, different
        UI. */}
    <Route path='details' element={
      <>
        <CioCheckoutStep id='address'>
          <AddressPicker onChange={(a) => {
            flow.setIntegratorState((p) => ({ ...p, addressId: a.id }));
            flow.next();                     // advance inline — URL unchanged
          }} />
        </CioCheckoutStep>
        <CioCheckoutStep id='shipping'>
          <ShippingPicker onChange={(r) => {
            flow.setIntegratorState((p) => ({ ...p, shippingId: r.id }));
            flow.next();                     // advance to 'gift-wrap' — URL changes
          }} />
        </CioCheckoutStep>
      </>
    } />
    <Route path='gift'     element={<GiftStep />} />
    <Route path='payment'  element={<PayStep />} />
    <Route path='complete' element={<Done />} />
  </Routes>
</CioCheckoutProvider>

// Behavior:
//  - URL stays on /details while address → shipping happens inline
//  - Advancing to gift-wrap pushes the URL to /gift
//  - Same for /payment and /complete
//  - Browser back works BETWEEN routed steps but not within the inline pair
`;
