import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import RootLayout from "./layouts/RootLayout";
import PageResolver from "./layouts/PageResolver";
import Home from "./pages/Home/Home";
import Cursor from "./components/Cursor/Cursor";
import WhatsAppButton from "./components/WhatsAppButton/WhatsAppButton";
import { initAnalytics, trackPageView } from "./lib/analytics";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function AnalyticsTracker() {
  const location = useLocation();
  useEffect(() => {
    trackPageView(location.pathname + location.search, document.title);
  }, [location]);
  return null;
}

export default function App() {
  useEffect(() => {
    initAnalytics();
  }, []);

  return (
    <BrowserRouter>
      <Cursor />
      <WhatsAppButton />
      <ScrollToTop />
      <AnalyticsTracker />
      <Routes>
        <Route path="/" element={<Navigate to="/fr" replace />} />
        <Route path="/:lang" element={<RootLayout />}>
          <Route index element={<Home />} />
          <Route path=":slug" element={<PageResolver />} />
        </Route>
        <Route path="*" element={<Navigate to="/fr" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
