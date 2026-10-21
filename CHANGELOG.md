# Changelog

## 2.0.0

Read the [Versioning & Migration](https://constructor-io.github.io/constructorio-ui-checkout/?path=/docs/guides-versioning-migration--docs) guide before upgrading. It has an upgrade checklist and what to change for each item below.

### Breaking changes

- Node.js 20 or newer is required (`engines.node` is `>=20`).
- `CheckoutUiMode`, `CheckoutRedirectBehavior` and `CheckoutLayout` are renamed to `CheckoutStripeUiMode`, `CheckoutStripeRedirectBehavior` and `CheckoutStripeLayout`.
- The `./constructorio-ui-checkout-standalone` subpath is now `./constructorio-ui-checkout-bundled`, and the file is `dist/constructorio-ui-checkout-bundled.js`. The CDN URL is unchanged.
- `CioCheckoutContext` is no longer exported. Use `useCioCheckout()`.
- `CREATE_SESSION_STEP` is removed.
- `CioCheckoutRegistry` is exported as a type only. Use the `cioCheckoutRegistry` singleton.
- `defaultTranslations` and `t` are no longer exported. Use the `translations` prop.
- `createCheckoutFlow` defaults its provider type to `BuiltInPaymentProvider`. Pass the generic for a custom provider.
- `CheckoutFlowState` has two new required fields, `cartTotal` and `paymentInProgress`.
- The unused translation keys `CioCheckout.checkout.title`, `cancelLabel`, `closeLabel`, `buttonLabel` and `buttonLoadingLabel` are removed.

### Behaviour changes

- `storage` without `storageKey` now saves under `DEFAULT_STORAGE_KEY` instead of emitting an error.
- `CioStripePaymentStep` shows a loader while the session is prepared, shows confirm errors in `'elements'` mode, and shows a configuration error when the flow has no `onCreateSession`.
- The bundled build loads its Google Fonts with `<link>` tags instead of CSS `@import`.
- A back or forward click the flow refuses puts the URL back on the current step, when the router adapter has `replace`.

### New

- `onCreateSession` is optional, for providers that create their own session.
- `useCioCheckoutSession()` hook.
- `flow.setPaymentInProgress()` and `state.paymentInProgress`.
- `state.cartTotal`.
- Optional `replace(path)` on the router adapter.
- `cioCheckoutRegistry.getFlow(provider)`.
- `CioFulfillmentStep` props `recreateSessionOnRetry` and `translations`.
- `DEFAULT_STORAGE_KEY`, `CheckoutLoaderRenderProps`, `UseCioCheckoutSessionReturn`, `CreateCheckoutFlowOptions`, `CheckoutFlowCoreBase`, `RequireAccessorsIfNeeded` and `KeyOfType` exports.
- New translation keys and a `loader` override slot.
