import { useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { Button } from "@constructor-io/constructorio-ui-components";

import { LoginForm } from "../components/checkoutParts";
import { useAuth } from "../contexts/AuthContext";
import { useFlowBasePath } from "../flows/shared/basePath";

export default function LoginPage() {
  const [params] = useSearchParams();
  const base = useFlowBasePath();
  const redirect = params.get("redirect") || `${base}/store`;
  const nav = useNavigate();
  const { user } = useAuth();
  const isGuestFlow = base === "/guest";

  useEffect(() => {
    if (user) nav(redirect, { replace: true });
  }, [user, redirect, nav]);

  return (
    <main className="page-narrow">
      <h1>Sign in</h1>
      <LoginForm onSuccess={() => nav(redirect, { replace: true })} />
      {isGuestFlow && (
        <div className="step-actions" style={{ marginTop: 24 }}>
          <Button
            type="button"
            variant="outline"
            onClick={() => nav(redirect, { replace: true })}
          >
            Continue as guest →
          </Button>
        </div>
      )}
      <p className="muted small" style={{ marginTop: 24 }}>
        <Link to="/">← Back to hub</Link>
      </p>
    </main>
  );
}
