import { Navigate, Route, Routes } from "react-router-dom";

import CodePanel from "../../components/CodePanel";
import { AuthGuard, CartGuard } from "../../components/guards";
import Header from "../../components/Header";
import CartPage from "../../pages/CartPage";
import LoginPage from "../../pages/LoginPage";
import ProductPage from "../../pages/ProductPage";
import StorePage from "../../pages/StorePage";
import FiservCheckout from "./FiservCheckout";
import { FISERV_SNIPPET } from "./snippet";

export const BASE_PATH = "/fiserv";

export default function FiservApp() {
  return (
    <>
      <Header />
      <CodePanel
        title="Wiring the 'fiserv' built-in flow"
        code={FISERV_SNIPPET}
      />
      <Routes>
        <Route index element={<Navigate to="store" replace />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="store" element={<StorePage />} />
        <Route path="products/:id" element={<ProductPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route
          path="checkout/*"
          element={
            <AuthGuard>
              <CartGuard>
                <FiservCheckout />
              </CartGuard>
            </AuthGuard>
          }
        />
      </Routes>
    </>
  );
}
