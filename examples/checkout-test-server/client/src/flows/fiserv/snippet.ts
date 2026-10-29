import { PIA_WIRING } from "../shared/piaSnippet";

export const FISERV_DESCRIPTION = `Built-in Fiserv CommerceHub integration. The Provider is configured with provider="fiserv" and the payment step is the library's <CioFiservPaymentStep />, which loads Fiserv's hosted-fields SDK, mounts four card iframes, and submits the card into a Fiserv PaymentSession. Nothing is charged yet: the /complete route mounts a <CioFulfillmentStep /> whose onFulfill POSTs the session id and cart to /api/fiserv/charge, where the server charges the session with its API secret. Fiserv spends a session on first use, so a failed charge sends the shopper back to the card form with a fresh session.`;

export const FISERV_SNIPPET =
  PIA_WIRING +
  "\n\n" +
  `// Fiserv built-in flow — provider='fiserv' narrows onCreateSession to
// FiservPaymentSession and allows <CioFiservPaymentStep /> to be mounted.
// Unlike Stripe, the card submit only stores the card in a session. The
// charge is a separate server call, made from <CioFulfillmentStep />.

<CioCheckoutProvider
  provider='fiserv'
  steps={[
    { id: 'recommendations', path: '/fiserv/checkout/recommendations' },
    { id: 'address', path: '/fiserv/checkout/address' },
    { id: 'payment', path: '/fiserv/checkout/payment', guard: (s) => s.cartSnapshot.length > 0 },
    { id: 'complete', path: '/fiserv/checkout/complete' },
  ]}
  router={reactRouterAdapter}
  storage={createSessionStorageAdapter()}
  storageAutoResume
  autoStart
  onCreateSession={async () => {
    // The server signs Fiserv's credentials call and returns
    // { sessionId, accessToken, publicKey, keyId, apiKey, merchantId, terminalId, environment }.
    const res = await fetch('/api/fiserv/session', { method: 'POST' });
    return res.json();
  }}>
  <Routes>
    <Route path='payment' element={
      <CioCheckoutStep id='payment'>
        {/* Hosted fields. On a captured submit the step calls flow.next(). */}
        <CioFiservPaymentStep amount={formatUsd(total)} frameAncestors={[location.origin]} />
      </CioCheckoutStep>
    } />
    <Route path='complete' element={
      <CioFulfillmentStep
        onFulfill={async () => {
          const res = await fetch('/api/fiserv/charge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: flow.getSession()?.sessionId, items }),
          });
          return res.json(); // { success, message }
        }}
        render={({ status, result, retry }) => …}
      />
    } />
  </Routes>
</CioCheckoutProvider>
`;
