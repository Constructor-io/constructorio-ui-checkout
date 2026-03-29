# Constructor.io UI Checkout

![minzipped size](https://img.shields.io/bundlephobia/minzip/@constructor-io/constructorio-ui-checkout?color=green)
[![NPM Version](https://img.shields.io/npm/v/@constructor-io/constructorio-ui-checkout)](https://www.npmjs.com/package/@constructor-io/constructorio-ui-checkout)
[![MIT licensed](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/Constructor-io/constructorio-ui-checkout/blob/main/LICENSE)

## Introduction

A React UI library that wraps Stripe's Embedded Checkout into a drop-in checkout experience with modal/inline display modes, fulfillment verification, and lifecycle callbacks.

Our [Storybook Docs](https://constructor-io.github.io/constructorio-ui-checkout) are the best place to explore the behavior and the available configuration options for this UI library.

## Installation

```bash
npm i @constructor-io/constructorio-ui-checkout
```

## Usage

### React Component

```tsx
import { CioCheckout } from '@constructor-io/constructorio-ui-checkout';
import '@constructor-io/constructorio-ui-checkout/style.css';

function App() {
  return (
    <CioCheckout
      session={async () => {
        const res = await fetch('/api/checkout-session', { method: 'POST' });
        return res.json(); // must return { clientSecret, publishableKey }
      }}
      triggerLabel="Buy Now"
      callbacks={{
        onComplete: (event) => console.log('Payment complete!', event.sessionId),
        onError: (error) => console.error('Checkout error:', error),
      }}
    />
  );
}
```

### Using the JavaScript Bundle

This is a framework-agnostic method that can be used in any JavaScript project.

```html
<div id="checkout-container"></div>
<script src="@constructor-io/constructorio-ui-checkout/constructorio-ui-checkout-standalone"></script>
<script>
  CioCheckout({
    selector: '#checkout-container',
    session: {
      clientSecret: 'cs_test_...',
      publishableKey: 'pk_test_...',
    },
  });
</script>
```

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

## Requirements

- Node.js >= 18
- React >= 16.12.0
- React DOM >= 16.12.0
- @stripe/stripe-js >= 2.0.0
- @stripe/react-stripe-js >= 2.0.0

## Supporting Docs

- [Storybook Docs](https://constructor-io.github.io/constructorio-ui-checkout)
- [Stripe Embedded Checkout](https://docs.stripe.com/checkout/embedded/quickstart)
- [Constructor.io](https://constructor.io)

## License

MIT - Constructor.io
