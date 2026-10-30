import { PIA_WIRING } from "../shared/piaSnippet";

export const SHOP_PAY_DESCRIPTION = `Built-in Shop Pay integration. The Provider is configured with provider="shop-pay" and no onCreateSession: Shop Pay starts its own session when the shopper clicks the button. The payment step is the library's <CioShopPayPaymentStep />, which loads Shopify's Payment Request SDK and renders the Shop Pay button. The popup calls three server routes through the step's callbacks: /api/shop-pay/session (Storefront API session create), /api/shop-pay/submit (Storefront API submit, returns a receipt token) and /api/shop-pay/receipt (Admin API lookup). Shopify creates the order after the popup closes, so the step polls the receipt and only moves to /complete once it is completed.`;

export const SHOP_PAY_SNIPPET =
  PIA_WIRING +
  "\n\n" +
  `// Shop Pay built-in flow — provider='shop-pay', no onCreateSession.
// The popup collects the address, shipping and card, so the flow is
// payment → complete. Capture and charge both happen inside the popup.

<CioCheckoutProvider
  provider='shop-pay'
  steps={[
    { id: 'payment', path: '/shop-pay/checkout/payment', guard: (s) => s.cartSnapshot.length > 0 },
    { id: 'complete', path: '/shop-pay/checkout/complete' },
  ]}
  router={reactRouterAdapter}
  storage={createSessionStorageAdapter()}
  storageAutoResume
  autoStart>
  <Routes>
    <Route path='payment' element={
      <CioCheckoutStep id='payment'>
        <CioShopPayPaymentStep
          shopId={SHOP_ID}
          clientId={CLIENT_ID}
          // What the popup shows. The server prices the submit again.
          paymentRequest={toPaymentRequest(items)}
          onSessionRequest={() => postJson('/api/shop-pay/session', { items })}
          onSubmitPayment={async ({ token, paymentMethod }) => {
            const body = await postJson('/api/shop-pay/submit', { token, paymentMethod, items });
            return body.token; // the receipt token
          }}
          onCheckReceipt={async (receiptToken) => {
            const r = await fetch('/api/shop-pay/receipt?token=' + encodeURIComponent(receiptToken));
            if (!r.ok) throw new Error('Receipt check failed (' + r.status + ')');
            return r.json();
          }}
        />
      </CioCheckoutStep>
    } />
    <Route path='complete' element={<OrderConfirmed />} />
  </Routes>
</CioCheckoutProvider>
`;
