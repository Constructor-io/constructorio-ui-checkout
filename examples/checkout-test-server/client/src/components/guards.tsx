import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";
import { useFlowBasePath } from "../flows/shared/basePath";

export function AuthGuard({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const location = useLocation();
  const base = useFlowBasePath();
  if (auth.user) return <>{children}</>;
  const target = `${location.pathname}${location.search}`;
  return (
    <Navigate
      to={`${base}/login?redirect=${encodeURIComponent(target)}`}
      replace
    />
  );
}

export function CartGuard({ children }: { children: ReactNode }) {
  const cart = useCart();
  const location = useLocation();
  const base = useFlowBasePath();
  const isExempt = location.pathname.endsWith("/complete");
  if (cart.items.length === 0 && !isExempt) {
    return <Navigate to={`${base}/cart`} replace />;
  }
  return <>{children}</>;
}
