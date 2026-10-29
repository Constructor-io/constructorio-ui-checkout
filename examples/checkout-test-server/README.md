# checkout-test-server

A demo store that uses `@constructor-io/constructorio-ui-checkout` the way a real app does. It has a React client and an Express server. The client depends on the library through `file:../../..`, so it always runs against this repo's working tree.

This app is type-checked in CI against the library build. A change in the library that breaks a real consumer fails the PR.

## Flows

Open the client and pick a flow from the home page.

| Path         | Flow                              | Shows                                                                     | Needs        |
| ------------ | --------------------------------- | ------------------------------------------------------------------------- | ------------ |
| `/full`      | Full retail flow                  | Routed steps, guards, `onUpdateSession`, sessionStorage resume            | Stripe keys  |
| `/guest`     | Guest checkout                    | The same flow with sign-in optional                                       | Stripe keys  |
| `/one-page`  | One-page checkout                 | Cart, address, shipping and payment on one route                          | Stripe keys  |
| `/resume`    | Backend storage resume            | A custom `CheckoutStorageAdapter` on the server, cross-tab resume         | Stripe keys  |
| `/expiry`    | Session expiry and recovery       | `flow.markExpired()`, automatic recreate, a live event log                | Stripe keys  |
| `/hook-only` | Hook-only, custom Stripe theme    | `useCioCheckoutSession()` and Stripe Elements without `CioStripePaymentStep` | Stripe keys  |
| `/mixed`     | Mixed routed and inline sub-steps | Some steps change the URL and some do not                                 | Stripe keys  |
| `/square`    | Square, custom provider           | `provider="square"`, `useCioCheckoutSession()`, `setPaymentInProgress()`  | Square keys  |
| `/fiserv`    | Fiserv, built-in hosted fields    | `provider="fiserv"`, `CioFiservPaymentStep`, server charge from `CioFulfillmentStep` | Fiserv keys  |

The store, the product pages and the PIA panel work with no payment keys.

## Setup

Requires Node.js 20 or newer, and [overmind](https://github.com/DarthSim/overmind) for `npm run dev` (`brew install overmind`).

Build the library first, from the repo root:

```bash
npm ci
npm run build
```

Then, in `examples/checkout-test-server`:

```bash
cp .env.example .env
npm run install:all
npm run dev
```

`npm run dev` starts the server on `PORT` (default `4000`) and the client on `CLIENT_PORT` (default `5173`). Open http://localhost:5173.

Without overmind, run the two processes in two terminals: `npm run dev:server` and `npm run dev:client`.

After a change in the library, run `npm run build` at the repo root again. The client picks up the new `dist/`.

## Environment

All config lives in `.env` at this folder's root. The server reads all of it. The client only sees values that start with `VITE_`.

| Variable                                     | Default                              | Used by                         |
| -------------------------------------------- | ------------------------------------ | ------------------------------- |
| `VITE_CIO_API_KEY`                           | Public demo index key                | Store search and PIA            |
| `VITE_SEED_ITEM_ID`                          | A product in the demo index          | Client                          |
| `DEMO_USER_EMAIL`, `DEMO_USER_PASSWORD`      | `demo@constructor.io` / `demo123`    | Server login fixtures           |
| `DEMO_VIP_EMAIL`, `DEMO_VIP_PASSWORD`        | `vip@constructor.io` / `vip123`      | Server login fixtures           |
| `VITE_DEMO_EMAIL`, `VITE_DEMO_PASSWORD`      | Same as the demo user                | Login form prefill              |
| `PORT`                                       | `4000`                               | Server, and the client's proxy  |
| `CLIENT_PORT`                                | `5173`                               | Client dev server               |
| `CLIENT_URL`                                 | `http://localhost:5173`              | Server CORS and Stripe return URL |
| `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY` | empty                               | Stripe flows. Test keys from https://dashboard.stripe.com/test/apikeys |
| `SQUARE_APPLICATION_ID`, `SQUARE_ACCESS_TOKEN`, `SQUARE_LOCATION_ID` | empty        | Square flow. Sandbox keys from https://developer.squareup.com/apps |
| `COMMERCEHUB_API_KEY`, `COMMERCEHUB_API_SECRET`, `COMMERCEHUB_MERCHANT_ID`, `COMMERCEHUB_TERMINAL_ID` | empty | Fiserv flow. CERT keys and a test merchant from https://developer.fiserv.com (CommerceHub). Test card `4005550000000019`. |
| `COMMERCEHUB_BASE_URL`                       | `https://connect-cert.fiservapis.com/ch` | Fiserv CERT API. Change only for production. |

Never commit `.env`.

## Type check

```bash
cd client && npx tsc --noEmit
cd ../server && npx tsc --noEmit
```

CI runs the same two commands after building the library. See `.github/workflows/example-check-types.yml` at the repo root.
