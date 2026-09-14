# Constructor.io UI Checkout

![minzipped size](https://img.shields.io/bundlephobia/minzip/@constructor-io/constructorio-ui-checkout?color=green)
[![NPM Version](https://img.shields.io/npm/v/@constructor-io/constructorio-ui-checkout)](https://www.npmjs.com/package/@constructor-io/constructorio-ui-checkout)
[![MIT licensed](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/Constructor-io/constructorio-ui-checkout/blob/main/LICENSE)

## Introduction

A React UI library that wraps Stripe's Custom Checkout into a drop-in checkout experience with modal/inline display modes, fulfillment verification, and lifecycle callbacks. Supports two Stripe surface modes: **elements** (GA Custom Checkout with PaymentElement) and **form** (beta Checkout Form with built-in UI).

Our [Storybook Docs](https://constructor-io.github.io/constructorio-ui-checkout) are the best place to explore the behavior and the available configuration options for this UI library.

## Installation

```bash
npm i @constructor-io/constructorio-ui-checkout
```

## Usage

### React Component

```tsx
import { CioCheckout } from '@constructor-io/constructorio-ui-checkout';
import '@constructor-io/constructorio-ui-checkout/styles.css';

function App() {
  return (
    <CioCheckout
      session={async () => {
        const res = await fetch('/api/checkout-session', { method: 'POST' });
        return res.json(); // must return { clientSecret, publishableKey }
      }}
      triggerLabel="Buy Now"
      uiMode="form" // 'form' (default) or 'elements'
      layout="expanded" // 'expanded' (default) or 'compact' — form mode only
      redirectBehavior="if_required" // 'if_required' (default) or 'always'
      callbacks={{
        onComplete: (event) =>
          console.log('Payment complete!', event.sessionId),
        onError: (error) => console.error('Checkout error:', error),
      }}
    />
  );
}
```

### Using the JavaScript Bundle

This is a framework-agnostic method that can be used in any JavaScript project. The `CioCheckout` object provides a simple interface to inject an entire Checkout UI into the provided `selector`.

```html
<div id="checkout-container"></div>
<script src="@constructor-io/constructorio-ui-checkout/constructorio-ui-checkout-standalone"></script>
<script>
  CioCheckout.init({
    selector: '#checkout-container',
    session: {
      clientSecret: 'cs_test_...',
      publishableKey: 'pk_test_...',
    },
  });
</script>
```

#### Standalone API

| Method                                   | Description                                            |
| ---------------------------------------- | ------------------------------------------------------ |
| `CioCheckout.init(options)`              | Mount the checkout UI into the given `selector`        |
| `CioCheckout.update(selector, newProps)` | Update props on an existing instance                   |
| `CioCheckout.destroy(selector?)`         | Unmount one or all instances                           |
| `CioCheckout.register(session)`          | Register a shared checkout session globally            |
| `CioCheckout.isRegistered()`             | Check whether a session has been registered            |
| `CioCheckout.reset()`                    | Reset checkout state and clear all registered sessions |
| `CioCheckout.VERSION`                    | The current library version                            |

### Registry Pattern

For non-React or multi-library setups, register a session globally once and omit the `session` prop:

```ts
import { checkoutRegistry } from '@constructor-io/constructorio-ui-checkout';

checkoutRegistry.register(async () => {
  const res = await fetch('/api/checkout-session', { method: 'POST' });
  return res.json();
});
```

```tsx
// No session prop needed - picks it up from the registry
<CioCheckout triggerLabel="Buy Now" />
```

## Local Development

> **Note:** Local development requires Node.js >= 20. The consuming library supports Node.js >= 18, but the Storybook 9 toolchain used for development (`@storybook/react-vite`, `@storybook/test-runner`, `@chromatic-com/storybook`) requires Node.js >= 20.

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

## Server-Side Setup

The server `ui_mode` depends on which `uiMode` the client uses: `'elements'` mode requires `ui_mode: 'elements'`, and `'form'` mode requires `ui_mode: 'form'` (beta). The example below shows form mode:

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
          unit_amount: 4999, // $49.99 in cents
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
- @stripe/react-stripe-js >= 6.3.0
- @constructor-io/constructorio-ui-components >= 1.0.0

## Supporting Docs

- [Stripe Custom Checkout](https://docs.stripe.com/payments/checkout/custom)
- [Stripe Checkout Form (Beta)](https://docs.stripe.com/payments/checkout/custom/checkout-form)
- [Constructor.io](https://constructor.io)

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
