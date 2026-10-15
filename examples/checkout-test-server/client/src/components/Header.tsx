import { Link, useLocation, useNavigate } from "react-router-dom";

import { Button } from "@constructor-io/constructorio-ui-components";

import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";
import { useFlowBasePath } from "../flows/shared/basePath";
import { resetDemoState, useVariant } from "../flows/variant";

const FLOW_LABELS: Record<string, string> = {
  full: "Full Retail",
  guest: "Guest",
  resume: "Backend Resume",
  "one-page": "One-Page",
  expiry: "Session Expiry",
  "hook-only": "Hook-only",
  mixed: "Mixed",
};

export default function Header() {
  const { user, logout } = useAuth();
  const { count, subtotal, clear } = useCart();
  const nav = useNavigate();
  const location = useLocation();
  const base = useFlowBasePath();
  const inFlow = base !== "";
  const lastVariant = useVariant();
  const lastVariantLabel = FLOW_LABELS[lastVariant] ?? lastVariant;
  const showLastFlow = !inFlow && !!sessionStorage.getItem("demo.flowVariant");

  const loginBase = inFlow ? base : "/full";
  const loginHref = `${loginBase}/login?redirect=${encodeURIComponent(`${location.pathname}${location.search}`)}`;

  return (
    <header className="app-header">
      <Link to={base || "/"} className="header-brand">
        <span className="brand-mark">Cio</span>Store
      </Link>
      {inFlow && (
        <nav className="header-nav">
          <Link to={`${base}/store`}>Browse</Link>
          <Link to="/">Showcases</Link>
        </nav>
      )}
      <div className="header-actions">
        {showLastFlow && (
          <Link to={`/${lastVariant}`} className="header-btn-ghost">
            Continue {lastVariantLabel} →
          </Link>
        )}
        {inFlow && (
          <>
            <button
              type="button"
              className="header-cart"
              onClick={() => nav(`${base}/cart`)}
              data-testid="header-cart"
            >
              Cart · {count} item{count === 1 ? "" : "s"} · $
              {subtotal.toFixed(2)}
            </button>
            {count > 0 && (
              <button
                type="button"
                className="header-clear"
                onClick={clear}
                title="Empty cart"
              >
                Clear cart
              </button>
            )}
          </>
        )}
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={() => resetDemoState()}
          title="Clear all demo state and return to hub"
        >
          ↻ Reset
        </Button>
        {user ? (
          <div className="header-user">
            <span className="header-user-name">{user.name}</span>
            <Button type="button" size="sm" onClick={logout}>
              Sign out
            </Button>
          </div>
        ) : (
          <Link to={loginHref}>
            <Button type="button" size="sm">
              Sign in
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
}
