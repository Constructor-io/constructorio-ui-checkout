import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { AuthGuard, CartGuard } from "../../components/guards";
import Header from "../../components/Header";
import CartPage from "../../pages/CartPage";
import LoginPage from "../../pages/LoginPage";
import ProductPage from "../../pages/ProductPage";
import StorePage from "../../pages/StorePage";
import { setVariant } from "../variant";
import ResumeCheckout from "./ResumeCheckout";

export const BASE_PATH = "/resume";

export default function ResumeApp() {
  useEffect(() => {
    setVariant("resume");
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
                <ResumeCheckout />
              </CartGuard>
            </AuthGuard>
          }
        />
      </Routes>
    </>
  );
}
