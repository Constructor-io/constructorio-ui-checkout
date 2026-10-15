export const PIA_WIRING = `// PIA is the primary checkout entry on every PDP.
// The pia widget renders with a checkoutTriggers array — each trigger is a
// button the user can click to start (or bypass) checkout. Triggers gate on
// engagement (state.currentAnswer or 2+ conversation turns) so the buttons
// only surface after the user has meaningfully interacted with pia.

import { CioPia } from '@constructor-io/constructorio-ui-pia';

<CioPia
  apiKey={CIO_API_KEY}
  itemId={product.id}
  itemName={product.name}
  checkoutTriggers={[
    // Basic: just add the product to the cart.
    {
      id: 'add-to-cart',
      label: 'Add to cart',
      triggerWhen: (state) => !!state.currentAnswer,
      onTrigger: () => cart.add(product),
    },
    // Express: open the modal buy-now flow (own <CioCheckoutProvider>).
    {
      id: 'buy-now',
      label: \`Buy Now — \${fmtUsd(product.price)}\`,
      triggerWhen: (state) => !!state.currentAnswer,
      onTrigger: () => setBuyNowModalOpen(true),
    },
    // Routed: add to cart and jump into the multi-step flow.
    {
      id: 'add-checkout',
      label: 'Add + Checkout',
      triggerWhen: (state) => !!state.currentAnswer,
      onTrigger: () => {
        cart.add(product);
        nav(auth.user
          ? '/<flow>/checkout/recommendations'
          : \`/<flow>/login?redirect=/<flow>/checkout/recommendations\`);
      },
    },
    // Bundle offer with deeper gating — appears after 2+ conversation turns.
    {
      id: 'bundle',
      label: 'Buy 2, save 25%',
      triggerWhen: (state) => state.conversationHistory.length >= 2,
      onTrigger: () => startBundleCheckout(),
    },
  ]}
/>
`;
