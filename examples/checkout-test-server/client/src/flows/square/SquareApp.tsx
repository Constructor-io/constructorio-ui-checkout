import { Navigate, Route, Routes } from "react-router-dom";

import CodePanel from "../../components/CodePanel";
import { AuthGuard, CartGuard } from "../../components/guards";
import Header from "../../components/Header";
import CartPage from "../../pages/CartPage";
import LoginPage from "../../pages/LoginPage";
import ProductPage from "../../pages/ProductPage";
import StorePage from "../../pages/StorePage";
import SquareCheckout from "./SquareCheckout";
import { SQUARE_SNIPPET } from "./snippet";

export const BASE_PATH = "/square";

export default function SquareApp() {
  return (
    <>
      <Header />
      <CodePanel
        title="Wiring the 'square' custom-PSP flow"
        code={SQUARE_SNIPPET}
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
                <SquareCheckout />
              </CartGuard>
            </AuthGuard>
          }
        />
      </Routes>
    </>
  );
}
