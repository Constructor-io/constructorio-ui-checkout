import { PIA_WIRING } from "../shared/piaSnippet";

export const SQUARE_DESCRIPTION = `Custom PSP integration using Square as the payment processor. The Provider is configured with provider="square", and the payment step is a bespoke <SquarePaymentStep /> that loads the Square Web Payments SDK, mounts a card element, tokenizes on submit, and POSTs the token to /api/square/pay. Session shape is extended via module augmentation on PaymentSessionMap so the flow's session object is typed as { applicationId, locationId, sessionId } — the SDK bootstrap params the payment step needs to initialize the card element.`;

export const SQUARE_SNIPPET =
  PIA_WIRING +
  "\n\n" +
  `// Square custom-PSP flow — same routed step layout as Full, but the payment
// step is fully owned by the merchant. The Provider is generic over the
// payment provider string, so provider='square' + module augmentation gives
// end-to-end type safety on the session shape.

// 1. Register the Square session shape with the library via module augmentation.
import type { BasePaymentSession } from '@constructor-io/constructorio-ui-checkout';

interface SquarePaymentSession extends BasePaymentSession {
  applicationId: string;
  locationId: string;
}

declare module '@constructor-io/constructorio-ui-checkout' {
  interface PaymentSessionMap {
    square: SquarePaymentSession;
  }
}

// 2. Wire the Provider with provider='square'. onCreateSession returns the
//    Square-shaped session object; onUpdateSession refreshes it so each pay
//    attempt uses a unique idempotency key.
<CioCheckoutProvider
  provider='square'
  steps={[
    { id: 'recommendations', path: '/square/checkout/recommendations' },
    { id: 'address', path: '/square/checkout/address' },
    {
      id: 'payment',
      path: '/square/checkout/payment',
      guard: (s) => s.cartSnapshot.length > 0,
    },
    { id: 'complete', path: '/square/checkout/complete' },
  ]}
  router={reactRouterAdapter}
  storage={createSessionStorageAdapter()}
  storageAutoResume
  autoStart
  onCreateSession={async (): Promise<SquarePaymentSession> => {
    const res = await fetch('/api/square/session', { method: 'POST' });
    return res.json(); // { applicationId, locationId, sessionId }
  }}
  onUpdateSession={async (): Promise<SquarePaymentSession> => {
    // Return a fresh session so each pay attempt uses a unique idempotency key.
    const res = await fetch('/api/square/session', { method: 'POST' });
    return res.json();
  }}>
  <Routes>
    <Route path='payment' element={
      <CioCheckoutStep id='payment'>
        <SquarePaymentStep amountCents={totalCents} />
      </CioCheckoutStep>
    } />
    …
  </Routes>
</CioCheckoutProvider>

// 3. The payment step drives the Square Web Payments SDK by hand.
function SquarePaymentStep({ amountCents }) {
  const flow = useCioCheckout<'square'>();
  const session = flow.getSession();
  const hostRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<SquareCard | null>(null);

  // Load the sandbox SDK and mount the card element once the session lands.
  useEffect(() => {
    if (!session) return;
    void loadSquareSdk().then(async () => {
      const payments = window.Square.payments(session.applicationId, session.locationId);
      const card = await payments.card();
      await card.attach(hostRef.current);
      cardRef.current = card;
    });
  }, [session]);

  const pay = async () => {
    const { token } = await cardRef.current.tokenize();
    const res = await fetch('/api/square/pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, sessionId: session.sessionId, amountCents }),
    });
    if ((await res.json()).success) void flow.next();
  };

  return (
    <>
      <div ref={hostRef} />
      <button onClick={pay}>Pay {formatUsd(amountCents)}</button>
    </>
  );
}
`;
