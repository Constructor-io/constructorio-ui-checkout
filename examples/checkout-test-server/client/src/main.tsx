import ReactDOM from "react-dom/client";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import Footer from "./components/Footer";
import { AuthProvider } from "./contexts/AuthContext";
import { CartProvider } from "./contexts/CartContext";
import HubPage from "./pages/HubPage";
import ReturnPage from "./ReturnPage";
import ExpiryApp from "./flows/expiry/ExpiryApp";
import FullApp from "./flows/full/FullApp";
import GuestApp from "./flows/guest/GuestApp";
import HookOnlyApp from "./flows/hookOnly/HookOnlyApp";
import MixedApp from "./flows/mixed/MixedApp";
import OnePageApp from "./flows/onePage/OnePageApp";
import ResumeApp from "./flows/resume/ResumeApp";
import SquareApp from "./flows/square/SquareApp";

import "@constructor-io/constructorio-ui-components/styles.css";
import "@constructor-io/constructorio-ui-checkout/styles.css";
import "@constructor-io/constructorio-ui-pia/styles.css";
import "./styles.css";

function AppRoutes() {
  const location = useLocation();
  const useLocalAuth = location.pathname.startsWith("/resume");

  return (
    <AuthProvider
      useLocalStorage={useLocalAuth}
      key={useLocalAuth ? "local" : "session"}
    >
      <CartProvider>
        <Routes>
          <Route path="/" element={<HubPage />} />
          <Route path="/full/*" element={<FullApp />} />
          <Route path="/guest/*" element={<GuestApp />} />
          <Route path="/resume/*" element={<ResumeApp />} />
          <Route path="/expiry/*" element={<ExpiryApp />} />
          <Route path="/hook-only/*" element={<HookOnlyApp />} />
          <Route path="/mixed/*" element={<MixedApp />} />
          <Route path="/one-page/*" element={<OnePageApp />} />
          <Route path="/square/*" element={<SquareApp />} />
          <Route path="/checkout/return" element={<ReturnPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Footer />
      </CartProvider>
    </AuthProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <AppRoutes />
  </BrowserRouter>,
);
