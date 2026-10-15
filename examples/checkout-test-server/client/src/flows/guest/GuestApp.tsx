import { Navigate, Route, Routes } from "react-router-dom";

import { CartGuard } from "../../components/guards";
import Header from "../../components/Header";
import CartPage from "../../pages/CartPage";
import LoginPage from "../../pages/LoginPage";
import ProductPage from "../../pages/ProductPage";
import StorePage from "../../pages/StorePage";
import GuestCheckout from "./GuestCheckout";

export const BASE_PATH = "/guest";

export default function GuestApp() {
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
            <CartGuard>
              <GuestCheckout />
            </CartGuard>
          }
        />
      </Routes>
    </>
  );
}
