import { useEffect, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import RootLayout from "./layouts/RootLayout";
import PageResolver from "./layouts/PageResolver";
import Home from "./pages/Home/Home";
import Cursor from "./components/Cursor/Cursor";
import WhatsAppButton from "./components/WhatsAppButton/WhatsAppButton";
import { initAnalytics, trackPageView } from "./lib/analytics";
import ErrorBoundary from "./components/ErrorBoundary/ErrorBoundary";

const MonEspaceApp = lazy(() => import("./pages/MonEspace/MonEspaceApp"));

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

// The marketing site's cursor and floating WhatsApp button are part of that
// site's own identity — Mon Espace is a different application living at the
// same domain, and shouldn't inherit either.
function MarketingChrome() {
  const { pathname } = useLocation();
  if (pathname.includes("/mon-espace")) return null;
  return (
    <>
      <Cursor />
      <WhatsAppButton />
    </>
  );
}

export default function App() {
  useEffect(() => {
    initAnalytics();
  }, []);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <MarketingChrome />
        <ScrollToTop />
        <AnalyticsTracker />
        <Routes>
          <Route path="/" element={<Navigate to="/fr" replace />} />
          {/* Mon Espace is a sibling of the RootLayout-wrapped marketing
              routes, not nested inside it — it needs to never inherit the
              marketing site's Navigation/Footer chrome. */}
          <Route
            path="/:lang/mon-espace/*"
            element={
              <Suspense fallback={<div className="min-h-screen bg-ink" />}>
                <MonEspaceApp />
              </Suspense>
            }
          />
          <Route path="/:lang" element={<RootLayout />}>
            <Route index element={<Home />} />
            <Route path=":slug" element={<PageResolver />} />
          </Route>
          <Route path="*" element={<Navigate to="/fr" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
