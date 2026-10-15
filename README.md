# Constructor.io UI Checkout

![minzipped size](https://img.shields.io/bundlephobia/minzip/@constructor-io/constructorio-ui-checkout?color=green)
[![NPM Version](https://img.shields.io/npm/v/@constructor-io/constructorio-ui-checkout)](https://www.npmjs.com/package/@constructor-io/constructorio-ui-checkout)
[![MIT licensed](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/Constructor-io/constructorio-ui-checkout/blob/main/LICENSE)

A headless checkout core with a built-in Stripe payment step. The library runs the steps, the payment session, storage and routing. Your app renders the cart, address, review and confirmation views.

It works with React, with plain JavaScript, or as a `<script>` tag bundle. Payment providers other than Stripe plug in through the same core.

**[Documentation →](https://constructor-io.github.io/constructorio-ui-checkout)**

## Install

```bash
npm i @constructor-io/constructorio-ui-checkout
```

## Usage

```tsx
import {
  CioCheckoutProvider,
  CioCheckoutStep,
  CioStripePaymentStep,
  PAYMENT_STEP,
  useCioCheckout,
} from '@constructor-io/constructorio-ui-checkout';
import '@constructor-io/constructorio-ui-checkout/styles.css';

function App() {
  return (
    <CioCheckoutProvider
      provider="stripe"
      steps={[{ id: 'cart' }, { id: PAYMENT_STEP }, { id: 'done' }]}
      onCreateSession={() =>
        fetch('/api/checkout-session', { method: 'POST' }).then((r) => r.json())
      }
    >
      <StartButton />
      <CioCheckoutStep id="cart">
        <MyCart />
      </CioCheckoutStep>
      <CioCheckoutStep id={PAYMENT_STEP}>
        <CioStripePaymentStep />
      </CioCheckoutStep>
      <CioCheckoutStep id="done">
        <MyConfirmation />
      </CioCheckoutStep>
    </CioCheckoutProvider>
  );
}

function StartButton() {
  const flow = useCioCheckout();
  if (flow.state.currentStepId !== null) return null;
  return <button onClick={() => flow.start()}>Checkout</button>;
}
```

Server setup, routing, persistence, custom payment providers and the `<script>` tag bundle are in the [docs](https://constructor-io.github.io/constructorio-ui-checkout).

## Local Development

### Development Scripts

```bash
npm ci                  # Install dependencies for local dev
npm run dev             # Start a local Storybook dev server
npm run lint            # Run lint
npm run lint:fix        # Run lint with auto-fix
npm run check-types     # Run TypeScript type checking
npm run test            # Run tests
npm run test:coverage   # Run tests with the coverage threshold
npm run check-license   # Check dependency licenses
```

### Library Maintenance

```bash
npm run build             # Build the library into dist
npm run build-storybook   # Build the Storybook static site for GitHub Pages
```

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

The library version is tracked by releases and git tags. This avoids pushing version bumps to the `main` branch, so no branch-protection exceptions are needed.

## New Storybook Version

Dispatch the [Deploy Storybook](https://github.com/Constructor-io/constructorio-ui-checkout/actions/workflows/deploy-storybook.yml) workflow in GitHub Actions.

#### Note: This is already done automatically when publishing a new version.

## Related Libraries

- [@constructor-io/constructorio-ui-pia](https://github.com/Constructor-io/constructorio-ui-pia) - AI Product Insights Agent UI library
- [@constructor-io/constructorio-ui-asa](https://github.com/Constructor-io/constructorio-ui-asa) - AI Shopping Agent UI library
- [@constructor-io/constructorio-client-javascript](https://github.com/Constructor-io/constructorio-client-javascript) - JavaScript client for Constructor.io API
- [@constructor-io/constructorio-ui-autocomplete](https://github.com/Constructor-io/constructorio-ui-autocomplete) - Autocomplete UI library
- [@constructor-io/constructorio-ui-plp](https://github.com/Constructor-io/constructorio-ui-plp) - Product Listing Page UI library

## Contributing

1. Fork the repo and create a new branch.
2. Run `npm ci` to install dependencies.
3. Make your changes.
4. Run `npm run lint` and `npm run test` to verify.
5. Submit a PR for review.

Please avoid committing anything sensitive: API keys, Stripe secret keys, customer data, or internal URLs. The default `.gitignore` excludes `.env*` files. Keep it that way.

## License

MIT - Constructor.io
