import { PIA_WIRING } from "../shared/piaSnippet";

export const RESUME_DESCRIPTION = `Same routed flow, but CheckoutFlowState lives on the merchant's server instead of sessionStorage. A custom async CheckoutStorageAdapter POSTs to /api/flow-state on every state change and loads from it on mount. Combined with localStorage-backed auth (so the user stays signed in across tab-close), this supports the classic "start on mobile, finish on desktop" and "open the abandoned-cart email tomorrow and pick up where you left off" patterns. Keyed by user id so different users' flows are isolated.`;

export const RESUME_SNIPPET =
  PIA_WIRING +
  "\n\n" +
  `
// Resume flow — flow state persists on the server, keyed by user id.
// Enables cross-tab, cross-device resume and abandoned-cart recovery.

// The CheckoutStorageAdapter interface is three async methods: load, save, clear.
// Everything the lib persists (currentStepId, cartSnapshot, sessionId,
// integrator state via metadata, etc.) flows through this adapter.

const backendAdapter: CheckoutStorageAdapter = {
  async load(key) {
    // key = 'cio-checkout::user:<userId>' — whatever we set as storageKey
    const { state } = await api.loadFlowState(userId);
    return (state as CheckoutFlowState | null) ?? null;
  },
  async save(_key, state) {
    // Fires on every state change (debounced by 150ms).
    await api.saveFlowState(userId, state);
  },
  async clear(_key) {
    await api.clearFlowState(userId);
  },
};

<CioCheckoutProvider
  provider='stripe'
  steps={[…same as Full…]}
  router={reactRouterAdapter}
  storage={backendAdapter}
  storageKey={\`cio-checkout::user:\${userId}\`}
  storageAutoResume
  autoStart
  onCreateSession={buildSession}
  onUpdateSession={rebuildSession}>
  <Routes>…</Routes>
</CioCheckoutProvider>

// For auth persistence across tab-close, the demo's AuthProvider picks
// localStorage vs sessionStorage based on the URL prefix:
const useLocalAuth = location.pathname.startsWith('/resume');
`;
