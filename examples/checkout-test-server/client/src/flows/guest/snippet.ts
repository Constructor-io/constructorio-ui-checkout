import { PIA_WIRING } from "../shared/piaSnippet";

export const GUEST_DESCRIPTION = `Same routed multi-step flow as Full, but the /guest/checkout/* subtree is NOT wrapped in AuthGuard. Users can go through checkout without ever signing in. LoginPage detects it's living under /guest and surfaces a "Continue as guest" button so a user who visits /guest/login can bypass sign-in and return to the flow. Everything else — persistence, session lifecycle, step config — is identical to Full.`;

export const GUEST_SNIPPET =
  PIA_WIRING +
  "\n\n" +
  `
// Guest flow — same steps as Full, but no AuthGuard on /guest/checkout/*.
// LoginPage surfaces a "Continue as guest" button when base path is /guest.

// In the app-level router:
<Route
  path='checkout/*'
  element={
    <CartGuard>
      <GuestCheckout />
    </CartGuard>
  }
/>
// ↑ no <AuthGuard> wrapping — that's the whole difference.

// LoginPage (shared) reads the current base path and adds a guest bypass:
export default function LoginPage() {
  const base = useFlowBasePath();
  const isGuestFlow = base === '/guest';
  return (
    <>
      <LoginForm onSuccess={() => nav(redirect)} />
      {isGuestFlow && (
        <button onClick={() => nav(redirect)}>Continue as guest →</button>
      )}
    </>
  );
}

// Checkout Provider config is identical to Full — recommendations → address →
// payment → complete, sessionStorage adapter, storageAutoResume, autoStart.
`;
