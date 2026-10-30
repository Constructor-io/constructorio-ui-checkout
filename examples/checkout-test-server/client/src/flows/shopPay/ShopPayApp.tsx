import { Navigate, Route, Routes } from "react-router-dom";

import CodePanel from "../../components/CodePanel";
import { AuthGuard, CartGuard } from "../../components/guards";
import Header from "../../components/Header";
import CartPage from "../../pages/CartPage";
import LoginPage from "../../pages/LoginPage";
import ProductPage from "../../pages/ProductPage";
import StorePage from "../../pages/StorePage";
import ShopPayCheckout from "./ShopPayCheckout";
import { SHOP_PAY_SNIPPET } from "./snippet";

export const BASE_PATH = "/shop-pay";

export default function ShopPayApp() {
  return (
    <>
      <Header />
      <CodePanel
        title="Wiring the 'shop-pay' built-in flow"
        code={SHOP_PAY_SNIPPET}
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
                <ShopPayCheckout />
              </CartGuard>
            </AuthGuard>
          }
        />
      </Routes>
    </>
  );
}
