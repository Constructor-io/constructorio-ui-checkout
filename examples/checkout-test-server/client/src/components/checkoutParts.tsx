import { FormEvent, useEffect, useState } from "react";

import { Button } from "@constructor-io/constructorio-ui-components";

import { useAuth } from "../contexts/AuthContext";
import { CartItem, useCart } from "../contexts/CartContext";
import { api, Address, ShippingRate } from "../lib/api";
import { DEMO_EMAIL, DEMO_PASSWORD, fmtUsd } from "../lib/constants";
import { searchProducts, StoreProduct } from "../lib/search";
import ProductCard from "./ProductCard";

export function LoginForm({ onSuccess }: { onSuccess?: () => void }) {
  const { login, isLoading, error } = useAuth();
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState(DEMO_PASSWORD);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      onSuccess?.();
    } catch {}
  };

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <label>
        Email
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
      </label>
      <label>
        Password
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
      </label>
      <p className="muted small">
        Demo credentials: <code>{DEMO_EMAIL}</code> /{" "}
        <code>{DEMO_PASSWORD}</code>. The VIP account is in <code>.env</code>.
      </p>
      {error && <div className="error-block">{error}</div>}
      <Button type="submit" variant="default" disabled={isLoading}>
        {isLoading ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

interface AddressPickerProps {
  value?: string;
  onChange: (address: Address) => void;
}

export function AddressPicker({ value, onChange }: AddressPickerProps) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api
      .listAddresses()
      .then(({ addresses }) => {
        if (!alive) return;
        setAddresses(addresses);
      })
      .catch((err) => alive && setError(err.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  if (loading) return <div className="muted">Loading addresses…</div>;
  if (error) return <div className="error-block">{error}</div>;

  return (
    <div
      className="option-list"
      role="radiogroup"
      aria-label="Shipping address"
    >
      {addresses.map((addr) => {
        const checked = value === addr.id;
        return (
          <label
            key={addr.id}
            className={`option ${checked ? "selected" : ""}`}
          >
            <input
              type="radio"
              name="address"
              value={addr.id}
              checked={checked}
              onChange={() => onChange(addr)}
            />
            <div className="option-body">
              <div className="option-title">{addr.label}</div>
              <div className="option-detail">
                {addr.line1}, {addr.city}
                {addr.region ? `, ${addr.region}` : ""} {addr.postalCode},{" "}
                {addr.country}
              </div>
            </div>
          </label>
        );
      })}
    </div>
  );
}

interface ShippingPickerProps {
  addressId?: string;
  value?: string;
  onChange: (rate: ShippingRate) => void;
}

export function ShippingPicker({
  addressId,
  value,
  onChange,
}: ShippingPickerProps) {
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!addressId) {
      setRates([]);
      return;
    }
    let alive = true;
    setLoading(true);
    setError(null);
    api
      .listShippingRates(addressId)
      .then(({ rates }) => {
        if (!alive) return;
        setRates(rates);
      })
      .catch((err) => alive && setError(err.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [addressId]);

  if (!addressId) {
    return (
      <div className="muted">Pick an address to see shipping options.</div>
    );
  }
  if (loading) return <div className="muted">Loading shipping rates…</div>;
  if (error) return <div className="error-block">{error}</div>;

  return (
    <div className="option-list" role="radiogroup" aria-label="Shipping method">
      {rates.map((rate) => {
        const checked = value === rate.id;
        return (
          <label
            key={rate.id}
            className={`option ${checked ? "selected" : ""}`}
          >
            <input
              type="radio"
              name="shipping"
              value={rate.id}
              checked={checked}
              onChange={() => onChange(rate)}
            />
            <div className="option-body">
              <div className="option-title">
                {rate.label} — {fmtUsd(rate.amount)}
              </div>
              <div className="option-detail">{rate.etaDays}</div>
            </div>
          </label>
        );
      })}
    </div>
  );
}

interface RecommendationsRailProps {
  seedQuery: string;
  onAdd?: (p: StoreProduct) => void;
  numResults?: number;
}

export function RecommendationsRail({
  seedQuery,
  onAdd,
  numResults = 4,
}: RecommendationsRailProps) {
  const [items, setItems] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    searchProducts(seedQuery || "shoes", numResults)
      .then((res) => alive && setItems(res))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [seedQuery, numResults]);

  if (loading) return <div className="muted">Loading recommendations…</div>;
  if (items.length === 0)
    return <div className="muted">Nothing found for “{seedQuery}”.</div>;

  return (
    <div className="rec-rail">
      {items.map((p) => (
        <ProductCard key={p.id} product={p} onAdd={onAdd} addLabel="+ add" />
      ))}
    </div>
  );
}

interface OrderSummaryProps {
  items?: CartItem[];
  shippingRate?: ShippingRate | null;
  taxRate?: number;
  headline?: string;
}

export function OrderSummary({
  items: itemsProp,
  shippingRate,
  taxRate = 0,
  headline = "Order summary",
}: OrderSummaryProps) {
  const cart = useCart();
  const items = itemsProp ?? cart.items;
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const shipping = shippingRate?.amount ?? 0;
  const tax = (subtotal + shipping) * taxRate;
  const total = subtotal + shipping + tax;

  return (
    <div className="order-summary">
      <h3>{headline}</h3>
      <ul className="order-summary-lines">
        {items.map((i) => (
          <li key={i.id}>
            <span>
              {i.name} × {i.quantity}
            </span>
            <span>{fmtUsd(i.price * i.quantity)}</span>
          </li>
        ))}
        {items.length === 0 && <li className="muted">Cart is empty.</li>}
      </ul>
      <dl className="order-summary-totals">
        <div>
          <dt>Subtotal</dt>
          <dd>{fmtUsd(subtotal)}</dd>
        </div>
        <div>
          <dt>Shipping</dt>
          <dd>
            {shippingRate ? `${shippingRate.label} — ${fmtUsd(shipping)}` : "—"}
          </dd>
        </div>
        {taxRate > 0 && (
          <div>
            <dt>Tax (est. {(taxRate * 100).toFixed(0)}%)</dt>
            <dd>{fmtUsd(tax)}</dd>
          </div>
        )}
        <div className="total">
          <dt>Total</dt>
          <dd>{fmtUsd(total)}</dd>
        </div>
      </dl>
    </div>
  );
}
