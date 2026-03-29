import { EmbeddedCheckout } from '@stripe/react-stripe-js';

export default function CheckoutForm() {
  return (
    <div className="cio-checkout-form">
      <EmbeddedCheckout />
    </div>
  );
}
