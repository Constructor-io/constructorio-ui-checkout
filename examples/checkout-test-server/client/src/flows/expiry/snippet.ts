import { PIA_WIRING } from "../shared/piaSnippet";

export const EXPIRY_DESCRIPTION = `Same routed flow with two additions: a "Simulate session expiry" button on the payment step and a live event-log panel below the flow. Clicking the button calls flow.markExpired() — the lib emits session.expired, <CioStripePaymentStep> automatically calls flow.recreate() to build a new Stripe session, then session.recreated fires with the old + new session IDs. The event log shows the whole sequence so you can see how expiry recovery works without waiting for Stripe's 24-hour clock.`;

export const EXPIRY_SNIPPET =
  PIA_WIRING +
  "\n\n" +
  `
// Expiry flow — same steps as Full plus expiry simulation UI + event log.

// On the payment step, a button fires markExpired() to simulate a Stripe
// session that timed out (or was killed by a backend webhook, etc.):
function PaymentStep() {
  const flow = useCioCheckout();
  return (
    <>
      <CioStripePaymentStep uiMode='elements' />
      <button onClick={() => flow.markExpired()}>
        Simulate session expiry
      </button>
    </>
  );
}

// Recovery is automatic — CioStripePaymentStep's own useEffect detects the
// 'expired' sessionStatus and calls flow.recreate(). No merchant code needed.
// If you're rolling your own Stripe layer, do the same check:
useEffect(() => {
  if (flow.state.sessionStatus === 'expired') void flow.recreate();
}, [flow.state.sessionStatus]);

// The event log below the flow captures every event fired by the Provider:
const [events, setEvents] = useState<CheckoutEvent[]>([]);

onEvent: (evt) => {
  setEvents((prev) => [...prev, evt]);
  // evt is a discriminated union — narrow by evt.type:
  //   'flow.started', 'flow.completed'
  //   'step.entered', 'step.exited'
  //   'session.created'   { sessionId }
  //   'session.updated'   { sessionId, reason, diff }
  //   'session.expired'   { sessionId }
  //   'session.recreated' { oldSessionId, newSessionId }
  //   'state.changed'     { state }
  //   'error'             { source, error, retry? }
}

// Simulate expiry → watch the log show:
//   session.expired    id=cs_test_a1b2c3d4…
//   session.recreated  cs_test_a1b2c3d4… → cs_test_e5f6g7h8…
//   session.created    id=cs_test_e5f6g7h8…
`;
