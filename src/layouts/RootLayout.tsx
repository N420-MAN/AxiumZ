import { Outlet } from "react-router-dom";
import { LocaleProvider } from "../i18n/LocaleContext";
import Navigation from "../components/Navigation/Navigation";
import Footer from "../components/Footer/Footer";
import StickyMobileBar from "../components/StickyMobileBar/StickyMobileBar";

export default function RootLayout() {
  return (
    <LocaleProvider>
      <div className="flex min-h-screen flex-col bg-ink pb-[calc(3.75rem+env(safe-area-inset-bottom))] sm:pb-0">
        <Navigation />
        <main className="flex-1">
          <Outlet />
        </main>
        <Footer />
        <StickyMobileBar />
      </div>
    </LocaleProvider>
  );
}
