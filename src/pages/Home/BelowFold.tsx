import { useEffect } from "react";
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

// Everything below the first two screens. Loaded as its own chunk after the hero has painted.
export default function BelowFold() {
  // These sections did not exist yet when the browser looked for a #hash target: scroll there now.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (id) document.getElementById(id)?.scrollIntoView();
  }, []);

  return (
    <>
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
