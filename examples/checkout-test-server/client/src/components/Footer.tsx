import { useFlowBasePath } from "../flows/shared/basePath";
import { EXPIRY_DESCRIPTION } from "../flows/expiry/snippet";
import { FULL_DESCRIPTION } from "../flows/full/snippet";
import { GUEST_DESCRIPTION } from "../flows/guest/snippet";
import { HOOK_ONLY_DESCRIPTION } from "../flows/hookOnly/snippet";
import { MIXED_DESCRIPTION } from "../flows/mixed/snippet";
import { ONEPAGE_DESCRIPTION } from "../flows/onePage/snippet";
import { RESUME_DESCRIPTION } from "../flows/resume/snippet";
import { SQUARE_DESCRIPTION } from "../flows/square/snippet";

const HUB_OVERVIEW = `Eight independent React apps under /full, /guest, /resume, /expiry, /hook-only, /mixed, /one-page, /square — each one is a self-contained demo of a different way to wire @constructor-io/constructorio-ui-checkout. Every app shares the same shopping shell (browse, product page, cart, login) but owns its own CioCheckoutProvider config, storage adapter, step composition, and route layout. Pick a card above to see one end-to-end.`;

const DESCRIPTIONS: Record<string, { title: string; body: string }> = {
  "": { title: "How the demo works", body: HUB_OVERVIEW },
  "/full": { title: "Full Retail Flow", body: FULL_DESCRIPTION },
  "/guest": { title: "Guest Checkout", body: GUEST_DESCRIPTION },
  "/resume": { title: "Backend Storage Resume", body: RESUME_DESCRIPTION },
  "/expiry": { title: "Session Expiry & Recovery", body: EXPIRY_DESCRIPTION },
  "/hook-only": { title: "Hook-only Payment", body: HOOK_ONLY_DESCRIPTION },
  "/mixed": { title: "Mixed · Routed + Inline", body: MIXED_DESCRIPTION },
  "/one-page": { title: "One-Page Checkout", body: ONEPAGE_DESCRIPTION },
  "/square": { title: "Square · Custom PSP", body: SQUARE_DESCRIPTION },
};

export default function Footer() {
  const base = useFlowBasePath();
  const entry = DESCRIPTIONS[base] ?? DESCRIPTIONS[""];

  return (
    <footer className="app-footer">
      <div className="app-footer-inner">
        <h3>{entry.title}</h3>
        <p>{entry.body}</p>
      </div>
    </footer>
  );
}
