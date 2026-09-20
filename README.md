# Constructor.io UI Checkout

![minzipped size](https://img.shields.io/bundlephobia/minzip/@constructor-io/constructorio-ui-checkout?color=green)
[![NPM Version](https://img.shields.io/npm/v/@constructor-io/constructorio-ui-checkout)](https://www.npmjs.com/package/@constructor-io/constructorio-ui-checkout)
[![MIT licensed](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/Constructor-io/constructorio-ui-checkout/blob/main/LICENSE)

## Introduction

Headless primitives for building multi-step checkout on top of Stripe. The library owns the state machine, session lifecycle, storage, routing, and the default Stripe surface — your app composes the UI (cart, address, review, confirmation, custom steps).

Our [Storybook Docs](https://constructor-io.github.io/constructorio-ui-checkout) are the best place to explore behavior, adapters, and full integration recipes.

## Installation

```bash
npm i @constructor-io/constructorio-ui-checkout
```

## Three integration paths, one core

| Path              | Best for                          | Entry                                          |
| ----------------- | --------------------------------- | ---------------------------------------------- |
| React             | React apps with the full flow     | `<CioCheckoutProvider>` + `useCioCheckout()`  |
| Vanilla JS (npm)  | Non-React SPAs or custom UIs      | `createCheckoutFlow(config)`                  |
| Standalone bundle | Server-rendered sites, `<script>` | `window.CioCheckout.resume(config)`           |

All three wrap the framework-agnostic `createCheckoutFlow(config)` core.

## Quick start (React)

```tsx
import {
  CioCheckoutProvider,
  CioCheckoutStep,
  CioStripePaymentStep,
  CioFulfillmentStep,
  PAYMENT_STEP,
  useCioCheckout,
} from '@constructor-io/constructorio-ui-checkout';
import '@constructor-io/constructorio-ui-checkout/styles.css';

function App() {
  return (
    <CioCheckoutProvider
      provider="stripe"
      steps={[
        { id: 'cart' },
        { id: 'address' },
        { id: PAYMENT_STEP },
        { id: 'fulfill' },
        { id: 'done' },
      ]}
      onCreateSession={async () => {
        const res = await fetch('/api/checkout-session', { method: 'POST' });
        return res.json(); // must return { clientSecret, publishableKey }
      }}
      onEvent={(event) => console.log(event)}
    >
      <StartButton />
      <CioCheckoutStep id="cart"><MyCart /></CioCheckoutStep>
      <CioCheckoutStep id="address"><MyAddressForm /></CioCheckoutStep>
      <CioCheckoutStep id={PAYMENT_STEP}>
        <CioStripePaymentStep uiMode="form" />
      </CioCheckoutStep>
      <CioCheckoutStep id="fulfill">
        <CioFulfillmentStep
          onFulfill={() => fetch('/api/verify').then((r) => r.json())}
        />
      </CioCheckoutStep>
      <CioCheckoutStep id="done"><MyConfirmation /></CioCheckoutStep>
    </CioCheckoutProvider>
  );
}

function StartButton() {
  const flow = useCioCheckout();
  if (flow.state.currentStepId !== null) return null;
  return <button onClick={() => flow.start()}>Checkout</button>;
}
```

You own the button, the layout, and every non-Stripe step. See the [Integration Guide](https://constructor-io.github.io/constructorio-ui-checkout/?path=/docs/getting-started-integration-guide--docs) for routed multi-step, modal presentation, guards, guest vs. login, and mid-flow cart updates.

## Standalone bundle

A framework-agnostic bundle for non-React SPAs, server-rendered sites, or `<script>`-tag integrations. The bundle exposes `window.CioCheckout` — a state-only namespace; you drive your own DOM.

```html
<script src="/path/to/constructorio-ui-checkout.standalone.js"></script>
<script>
  const flow = CioCheckout.resume({
    steps: [{ id: 'cart' }, { id: 'payment' }, { id: 'done' }],
    onCreateSession: () =>
      fetch('/api/checkout-session', { method: 'POST' }).then((r) => r.json()),
    onEvent: (e) => console.log(e),
  });

  flow.start();
</script>
```

Consuming through a bundler? Import the same bundle via subpath — same `CioCheckout` surface:

```js
import CioCheckout from '@constructor-io/constructorio-ui-checkout/constructorio-ui-checkout-standalone';
```

`CioCheckout.resume(config)` creates a checkout flow backed by a `sessionStorage` adapter (auto-hydrates on page load) and registers it as the active flow so any other CIO library on the page can reach it.

### Standalone API

| Member                                    | Description                                                                       |
| ----------------------------------------- | --------------------------------------------------------------------------------- |
| `CioCheckout.VERSION`                     | Library version string                                                            |
| `CioCheckout.createCheckoutFlow`          | Factory returning the framework-agnostic checkout flow                            |
| `CioCheckout.createSessionStorageAdapter` | Default sessionStorage-backed `CheckoutStorageAdapter`                            |
| `CioCheckout.resume(config)`              | Creates + registers a flow with the sessionStorage adapter injected               |
| `CioCheckout.reset()`                     | Destroys the registered flow                                                      |
| `CioCheckout.cioCheckoutRegistry`         | Singleton registry — `register(flow)`, `getFlow()`, `hasFlow()`, `clear()`        |

## Registry pattern

For multi-library setups where another CIO library (e.g. `pia`) needs to reach the active checkout flow, register once and let others call `getFlow()`:

```ts
import {
  createCheckoutFlow,
  cioCheckoutRegistry,
} from '@constructor-io/constructorio-ui-checkout';

const flow = createCheckoutFlow({ provider: 'stripe', steps, onCreateSession, ... });
cioCheckoutRegistry.register(flow);

// Elsewhere:
const active = cioCheckoutRegistry.getFlow();
active?.syncCart(newItems);
```

## Persistence & resume

Persistence is opt-in. Pass a `storage` adapter + `storageKey` to `CioCheckoutProvider` (or `createCheckoutFlow`) and the library serializes `CheckoutFlowState` on every change and hydrates on next mount:

```tsx
import { createSessionStorageAdapter } from '@constructor-io/constructorio-ui-checkout';

<CioCheckoutProvider
  storage={createSessionStorageAdapter()}
  storageKey={`checkout-${userId}`}
  ...
/>
```

Supply your own adapter (Redis, DynamoDB, your API) for B2B pause/resume, cross-device recovery, or emailed abandoned-cart links. See [Persistence & Resume](https://constructor-io.github.io/constructorio-ui-checkout/?path=/docs/adapters-persistence--docs) for the full recipe.

## Local Development

> **Note:** Local development requires Node.js >= 20. The consuming library supports Node.js >= 18, but the Storybook 9 toolchain requires Node.js >= 20.

### Development scripts

```bash
npm ci                  # install dependencies for local dev
npm run dev             # start a local Storybook dev server
npm run lint            # run linter
npm run lint:fix        # run linter with auto-fix
npm run check-types     # run TypeScript type checking
npm run test            # run tests
npm run test:coverage   # run tests with coverage report
npm run check-license   # check dependency licenses
npm run build           # build the library
npm run build-storybook # build Storybook for deployment
```

## Server-side setup

Your backend creates the Stripe Checkout Session and returns `{ clientSecret, publishableKey }` to the library. The server `ui_mode` must match the client `uiMode` you pass to `<CioStripePaymentStep>`: `'form'` (beta) or `'elements'` (GA).

```js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

app.post('/api/checkout-session', async (req, res) => {
  const session = await stripe.checkout.sessions.create({
    ui_mode: 'form', // use 'elements' for the elements uiMode
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: { name: 'Product Name' },
          unit_amount: 4999,
        },
        quantity: 1,
      },
    ],
    return_url:
      'https://example.com/order-confirm?session_id={CHECKOUT_SESSION_ID}',
  });

  res.json({
    clientSecret: session.client_secret,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  });
});
```

> **Note:** Requires `stripe` SDK v18+. `ui_mode: 'form'` is in beta and requires Stripe to enable it on the account.

## Requirements

- Node.js >= 18
- React >= 16.12.0
- React DOM >= 16.12.0
- @stripe/stripe-js >= 9.3.1
- @stripe/react-stripe-js >= 6.6.0
- @constructor-io/constructorio-ui-components >= 1.4.0

## Supporting Docs

- [Stripe Custom Checkout (embedded components)](https://docs.stripe.com/payments/checkout/how-checkout-works?payment-ui=embedded-components)
- [Stripe Checkout Form (embedded form, beta)](https://docs.stripe.com/payments/checkout/how-checkout-works?payment-ui=embedded-form)
- [Stripe Embedded Checkout — Quickstart](https://docs.stripe.com/checkout/embedded/quickstart)
- [Constructor.io](https://constructor.com)

## Publishing New Versions

Dispatch the [Publish](https://github.com/Constructor-io/constructorio-ui-checkout/actions/workflows/publish.yml) workflow in GitHub Actions. You're required to provide two arguments:

- **Version Strategy**: `major`, `minor`, or `patch`.
- **Title**: A title for the release.

This workflow will automatically:

1. Bump the library version using the provided strategy.
2. Create a new git tag.
3. Create a new GitHub release.
4. Compile the library.
5. Publish the new version to NPM.
6. Deploy the Storybook docs to GitHub Pages.

#### Note: Please don't manually increase the package.json version or create new git tags.

The library version is tracked by releases and git tags. This intentionally avoids pushing version bumps to the `main` branch, sidestepping branch-protection rule exceptions.

## Contributing

1. Fork the repo and create a new branch.
2. Run `npm ci` to install dependencies.
3. Make your changes.
4. Run `npm run lint` and `npm test` to verify.
5. Submit a PR for review.

Please avoid committing anything sensitive — API keys, Stripe secret keys, customer data, or internal URLs. The default `.gitignore` excludes `.env*` files; keep it that way.

## License

MIT - Constructor.io
