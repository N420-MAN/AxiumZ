import { useLocale } from "../../i18n/LocaleContext";
import { usePageMeta } from "../../hooks/usePageMeta";
import Hero from "./sections/Hero";
import Proof from "./sections/Proof";
import Positioning from "./sections/Positioning";
import Activites from "./sections/Activites";
import Methodologie from "./sections/Methodologie";
import Organisation from "./sections/Organisation";
import Programmes from "./sections/Programmes";
import Journey from "./sections/Journey";
import ProgressSection from "./sections/Progress";
import FinalCta from "./sections/FinalCta";
import CallBanner from "../../components/CallBanner/CallBanner";
import FAQAccordion from "../../components/FAQ/FAQAccordion";
import Comparison from "../../components/Comparison/Comparison";
import NeedsFinder from "../../components/NeedsFinder/NeedsFinder";
import MethodologyJourney from "../../components/MethodologyJourney/MethodologyJourney";

export default function Home() {
  const { t } = useLocale();
  usePageMeta(t.meta.titleSuffix, t.meta.defaultDescription, "home");

  return (
    <>
      <Hero />
      <Proof />
      <Positioning />
      <Comparison />
      <NeedsFinder />
      <Activites />
      <CallBanner tone="gold" />
      <Methodologie />
      <MethodologyJourney />
      <Organisation />
      <Programmes />
      <CallBanner tone="red" />
      <Journey />
      <ProgressSection />
      <FAQAccordion />
      <FinalCta />
    </>
  );
}
