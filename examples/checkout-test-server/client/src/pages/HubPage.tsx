import { Link } from "react-router-dom";

import { Badge } from "@constructor-io/constructorio-ui-components";

import Header from "../components/Header";

interface Showcase {
  id: string;
  title: string;
  blurb: string;
  path: string;
  concepts: string[];
}

const SHOWCASES: Showcase[] = [
  {
    id: "full",
    title: "Full Retail Flow",
    blurb:
      "Multi-step, routed checkout: recommendations → address (+shipping) → payment → confirmation. Uses the default sessionStorage adapter with storageAutoResume — refresh mid-flow and you land right back on your step with cart + selections intact.",
    path: "/full",
    concepts: [
      "routed steps",
      "guards",
      "onUpdateSession",
      "sessionStorage",
      "refresh survives",
    ],
  },
  {
    id: "guest",
    title: "Guest Checkout",
    blurb:
      'Same routed flow but no AuthGuard — sign-in is optional. LoginPage surfaces a "Continue as guest" button so users can proceed without an account.',
    path: "/guest",
    concepts: ["no auth guard", "sign-in optional", "sessionStorage"],
  },
  {
    id: "one-page",
    title: "One-Page Checkout",
    blurb:
      "Cart, address, shipping, and Stripe payment all on one route. Payment element mounts only after all sections are complete — its built-in Pay button drives the charge.",
    path: "/one-page",
    concepts: ["single route", "inline CioCheckoutStep", "guard()"],
  },
  {
    id: "resume",
    title: "Backend Storage Resume",
    blurb:
      "Custom async CheckoutStorageAdapter hitting /api/flow-state. State survives tab close and syncs across tabs/devices. Login uses localStorage so it lives past the tab too.",
    path: "/resume",
    concepts: [
      "custom CheckoutStorageAdapter",
      "cross-tab / cross-device resume",
      "abandoned cart recovery",
    ],
  },
  {
    id: "expiry",
    title: "Session Expiry & Recovery",
    blurb:
      'Same routed flow with a "Simulate expiry" button on the payment step. Fires flow.markExpired(), the lib emits session.expired, CioStripePaymentStep auto-recreates, session.recreated follows. Live event log renders below the flow.',
    path: "/expiry",
    concepts: [
      "flow.markExpired()",
      "recreate()",
      "session.expired",
      "session.recreated",
      "onEvent stream",
    ],
  },
  {
    id: "hook-only",
    title: "Hook-only · custom Stripe theme",
    blurb:
      "Payment step skips <CioStripePaymentStep> and drives Stripe directly via CheckoutElementsProvider + useCheckoutElements(). Fully custom Appearance.",
    path: "/hook-only",
    concepts: [
      "useCioCheckout() imperative",
      "own the Stripe layer",
      "custom Appearance",
      "no CioStripePaymentStep",
    ],
  },
  {
    id: "mixed",
    title: "Mixed · routed + inline sub-steps",
    blurb:
      "Combines both routing styles: /details holds two inline sub-steps (address, shipping) that advance without URL change; then /gift, /payment, /complete each get their own routes.",
    path: "/mixed",
    concepts: [
      "mixed path + inline",
      "4 routes, 5 steps",
      "URL sometimes changes on flow.next()",
    ],
  },
  {
    id: "square",
    title: "Square · custom PSP",
    blurb:
      'Same routed layout as Full, but the payment step is a custom <SquarePaymentStep /> that drives the Square Web Payments SDK sandbox. Provider is generic over the PSP — provider="square" plus module augmentation on PaymentSessionMap gives end-to-end typed sessions.',
    path: "/square",
    concepts: [
      'provider="square"',
      "custom payment step",
      "module augmentation",
      "Web Payments SDK",
    ],
  },
  {
    id: "fiserv",
    title: "Fiserv · built-in hosted fields",
    blurb:
      'Same routed layout as Full, but provider="fiserv" with the built-in <CioFiservPaymentStep />. Fiserv captures the card into a session; the server then charges that session from a <CioFulfillmentStep />. Shows the two-step shape a PSP needs when the charge is a separate server call.',
    path: "/fiserv",
    concepts: [
      'provider="fiserv"',
      "CioFiservPaymentStep",
      "CioFulfillmentStep",
      "server charge",
    ],
  },
  {
    id: "shop-pay",
    title: "Shop Pay · built-in popup",
    blurb:
      'provider="shop-pay" with the built-in <CioShopPayPaymentStep /> and no onCreateSession. The Shop Pay popup collects address, shipping and card, and charges inside the popup. The step polls the receipt and only completes once Shopify has made the order. Runs on localhost only.',
    path: "/shop-pay",
    concepts: [
      'provider="shop-pay"',
      "CioShopPayPaymentStep",
      "no onCreateSession",
      "receipt polling",
    ],
  },
];

export default function HubPage() {
  return (
    <>
      <Header />
      <main className="page-hub">
        <section className="hub-hero">
          <h1>Constructor.io Checkout — Showcases</h1>
        </section>

        <ul className="hub-grid">
          {SHOWCASES.map((s) => {
            const titleId = `hub-card-title-${s.id}`;
            return (
              <li key={s.id} className="hub-card-item">
                <Link
                  to={s.path}
                  className="hub-card"
                  aria-labelledby={titleId}
                >
                  <h2 id={titleId}>{s.title}</h2>
                  <p>{s.blurb}</p>
                  <div className="hub-concepts">
                    {s.concepts.map((c) => (
                      <Badge
                        key={c}
                        variant="secondary"
                        size="md"
                        shape="rounded"
                      >
                        {c}
                      </Badge>
                    ))}
                  </div>
                  <span className="hub-card-cta" aria-hidden="true">
                    Try it <span className="hub-card-arrow">→</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </main>
    </>
  );
}
