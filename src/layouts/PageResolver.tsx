import { Suspense, lazy } from "react";
import { useParams } from "react-router-dom";
import { useLocale } from "../i18n/LocaleContext";
import { pageForSlug } from "../i18n/config";

const Centre = lazy(() => import("../pages/Centre/Centre"));
const Activites = lazy(() => import("../pages/Activites/Activites"));
const Programmes = lazy(() => import("../pages/Programmes/Programmes"));
const Methodologie = lazy(() => import("../pages/Methodologie/Methodologie"));
const Contact = lazy(() => import("../pages/Contact/Contact"));
const Inscription = lazy(() => import("../pages/Inscription/Inscription"));
const MonEspace = lazy(() => import("../pages/MonEspace/MonEspace"));
const Privacy = lazy(() => import("../pages/Privacy/Privacy"));
const NotFound = lazy(() => import("../pages/NotFound/NotFound"));

export default function PageResolver() {
  const { locale } = useLocale();
  const { slug } = useParams<{ slug: string }>();
  const page = pageForSlug(locale, slug);

  const page_element = (() => {
    switch (page) {
      case "centre":
        return <Centre />;
      case "activites":
        return <Activites />;
      case "programmes":
        return <Programmes />;
      case "methodologie":
        return <Methodologie />;
      case "contact":
        return <Contact />;
      case "inscription":
        return <Inscription />;
      case "monEspace":
        return <MonEspace />;
      case "privacy":
        return <Privacy />;
      default:
        return <NotFound />;
    }
  })();

  return <Suspense fallback={<div className="min-h-screen bg-ink" />}>{page_element}</Suspense>;
}
