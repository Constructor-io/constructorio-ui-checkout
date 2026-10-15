import { PIA_WIRING } from "../shared/piaSnippet";

export const HOOK_ONLY_DESCRIPTION = `Same routed flow, but the payment step skips <CioStripePaymentStep> entirely and drives Stripe by hand via useCioCheckout() + CheckoutElementsProvider from @stripe/react-stripe-js/checkout. Use this pattern when the built-in payment step doesn't give your design system enough control — you own the Elements provider config, the appearance object, the loading and error states, and the Pay button.`;

export const HOOK_ONLY_SNIPPET =
  PIA_WIRING +
  "\n\n" +
  `
// Hook-only flow — no <CioStripePaymentStep>. Drive Stripe directly.

import {
  CheckoutElementsProvider,
  PaymentElement,
  useCheckoutElements,
} from '@stripe/react-stripe-js/checkout';
import { loadStripe } from '@stripe/stripe-js';
import { useCioCheckoutSession } from '@constructor-io/constructorio-ui-checkout';

const BRAND_APPEARANCE = {
  theme: 'stripe',
  variables: {
    colorPrimary: '#4338ca',
    colorBackground: '#fefce8',
    borderRadius: '10px',
    // …fully custom Appearance object
  },
};

function HookOnlyPayment() {
  // Creates the session on idle and recreates it on expiry, the same hook
  // CioStripePaymentStep uses.
  const { session, sessionStatus: status, retry } = useCioCheckoutSession();

  const stripe = useMemo(
    () => session && loadStripe(session.publishableKey),
    [session],
  );

  if (status === 'error') return <RetryUI onRetry={retry} />;
  if (!session || !stripe) return <Loading />;

  return (
    <CheckoutElementsProvider
      stripe={stripe}
      options={{
        clientSecret: session.clientSecret,
        elementsOptions: { appearance: BRAND_APPEARANCE },
      }}>
      <BrandedForm onSuccess={() => flow.next()} />
    </CheckoutElementsProvider>
  );
}

function BrandedForm({ onSuccess }) {
  const co = useCheckoutElements();
  return (
    <>
      <PaymentElement onChange={(e) => setReady(e.complete)} />
      <MyBrandButton
        disabled={!ready}
        onClick={async () => {
          const r = await co.checkout.confirm({ redirect: 'if_required' });
          if (r.type === 'success') onSuccess();
          else setError(r.error.message);
        }}>
        Pay {co.checkout.total.total.amount}
      </MyBrandButton>
    </>
  );
}
`;
