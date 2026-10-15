import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { AuthGuard, CartGuard } from "../../components/guards";
import Header from "../../components/Header";
import CartPage from "../../pages/CartPage";
import LoginPage from "../../pages/LoginPage";
import ProductPage from "../../pages/ProductPage";
import StorePage from "../../pages/StorePage";
import { setVariant } from "../variant";
import MixedCheckout from "./MixedCheckout";

export const BASE_PATH = "/mixed";

export default function MixedApp() {
  useEffect(() => {
    setVariant("mixed");
  }, []);

  return (
    <>
      <Header />
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
                <MixedCheckout />
              </CartGuard>
            </AuthGuard>
          }
        />
      </Routes>
    </>
  );
}
