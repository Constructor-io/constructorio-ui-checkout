import { Link, useNavigate } from "react-router-dom";

import { Button } from "@constructor-io/constructorio-ui-components";

import { OrderSummary } from "../components/checkoutParts";
import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";
import { fmtUsd } from "../lib/constants";
import { useFlowBasePath } from "../flows/shared/basePath";

const CHECKOUT_ENTRY: Record<string, string> = {
  "/full": "/full/checkout/recommendations",
  "/guest": "/guest/checkout/recommendations",
  "/resume": "/resume/checkout/recommendations",
  "/expiry": "/expiry/checkout/recommendations",
  "/hook-only": "/hook-only/checkout/recommendations",
  "/one-page": "/one-page/checkout",
  "/mixed": "/mixed/checkout/details",
};

export default function CartPage() {
  const cart = useCart();
  const auth = useAuth();
  const base = useFlowBasePath();
  const nav = useNavigate();

  const goToCheckout = () => {
    const target = CHECKOUT_ENTRY[base] ?? `${base}/checkout/recommendations`;
    nav(
      auth.user
        ? target
        : `${base}/login?redirect=${encodeURIComponent(target)}`,
    );
  };

  return (
    <main className="page-narrow">
      <h1>Your cart</h1>

      {cart.items.length === 0 ? (
        <div className="muted" style={{ padding: 24 }}>
          Your cart is empty. <Link to={`${base}/store`}>Browse products</Link>.
        </div>
      ) : (
        <ul className="cart-list">
          {cart.items.map((i) => (
            <li key={i.id}>
              <img src={i.imageUrl} alt="" />
              <div className="cart-line-body">
                <div>{i.name}</div>
                <div className="muted small">{fmtUsd(i.price)} each</div>
              </div>
              <div className="cart-line-qty">
                <button
                  type="button"
                  onClick={() => cart.setQuantity(i.id, i.quantity - 1)}
                >
                  −
                </button>
                <span>{i.quantity}</span>
                <button
                  type="button"
                  onClick={() => cart.setQuantity(i.id, i.quantity + 1)}
                >
                  +
                </button>
              </div>
              <div className="cart-line-total">
                {fmtUsd(i.price * i.quantity)}
              </div>
              <button
                type="button"
                className="linkish"
                onClick={() => cart.remove(i.id)}
              >
                remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {cart.items.length > 0 && <OrderSummary headline="Cart total" />}

      <div className="step-actions">
        <Link to={`${base}/store`}>
          <Button variant="outline">← Keep shopping</Button>
        </Link>
        <Button
          type="button"
          variant="default"
          disabled={cart.items.length === 0}
          onClick={goToCheckout}
        >
          Checkout →
        </Button>
      </div>
    </main>
  );
}
