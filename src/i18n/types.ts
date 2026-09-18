export interface Dictionary {
  meta: {
    titleSuffix: string;
    defaultDescription: string;
  };
  nav: {
    centre: string;
    activites: string;
    programmes: string;
    methodologie: string;
    contact: string;
    inscription: string;
    monEspace: string;
    menu: string;
    close: string;
    callNow: string;
    callShort: string;
  };
  home: {
    hero: {
      eyebrow: string;
      headline: string[];
      sub: string;
      ctaPrimary: string;
      ctaSecondary: string;
      callPrompt: string;
    };
    proof: {
      items: { value: string; label: string }[];
    };
    positioning: {
      label: string;
      title: string;
      body: string;
      link: string;
      approachTitle: string;
      approachBody: string;
    };
    activites: {
      label: string;
      title: string;
      body: string;
      items: { index: string; title: string[]; body: string; tag: string }[];
    };
    methodologie: {
      label: string;
      title: string;
      link: string;
      flow: string[];
      items: { index: string; title: string; body: string }[];
    };
    organisation: {
      label: string;
      title: string;
      body: string;
      link: string;
      stats: { value: string; label: string }[];
    };
    programmes: {
      label: string;
      title: string;
      body: string;
      system: string;
      items: { index: string; title: string; body: string; link: string }[];
    };
    journey: {
      label: string;
      title: string;
      items: { index: string; title: string; body: string }[];
    };
    progress: {
      label: string;
      title: string;
      body: string;
      disclaimer: string;
      panelLabel: string;
      panelStatus: string;
      metrics: { label: string; value: number }[];
      nextSession: string;
      nextSessionValue: string;
      badge: string;
      badgeSub: string;
    };
    finalCta: {
      label: string;
      title: string;
      body: string;
      ctaPrimary: string;
      ctaSecondary: string;
      phoneLabel: string;
    };
  };
  centrePage: {
    hero: { eyebrow: string; title: string; body: string };
    approach: { title: string; body: string; subtitle: string; text: string };
    values: { title: string; items: { title: string; body: string }[] };
  };
  activitesPage: {
    hero: { eyebrow: string; title: string; body: string };
    items: { index: string; title: string; body: string; detail: string }[];
  };
  programmesPage: {
    hero: { eyebrow: string; title: string; body: string };
    system: string;
    items: { index: string; title: string; body: string }[];
  };
  methodologiePage: {
    hero: { eyebrow: string; title: string; body: string };
    flow: string[];
    items: { index: string; title: string; body: string }[];
  };
  contactPage: {
    hero: { eyebrow: string; title: string; body: string };
    formTitle: string;
    phoneLabel: string;
    whatsappCta: string;
    locationLabel: string;
    locationTitle: string;
    locationBody: string;
    mapCta: string;
  };
  inscriptionForm: {
    intro: string;
    section1: string;
    lastName: string;
    firstName: string;
    birthDate: string;
    level: string;
    levelPlaceholder: string;
    levelOptions: string[];
    school: string;
    section2: string;
    activity: string;
    activityPlaceholder: string;
    activityOptions: string[];
    subject: string;
    subjectPlaceholder: string;
    subjectOptions: string[];
    needs: string;
    availability: string;
    section3: string;
    guardianName: string;
    relation: string;
    relationPlaceholder: string;
    relationOptions: string[];
    phone: string;
    email: string;
    preferredContact: string;
    preferredContactOptions: string[];
    consent: string;
    submit: string;
    sending: string;
    requiredNote: string;
    successTitle: string;
    successBody: string;
    errorBody: string;
    sendAnother: string;
  };
  inscriptionPage: {
    hero: { eyebrow: string; title: string; body: string };
    steps: { index: string; title: string; body: string }[];
    ctaTitle: string;
    ctaBody: string;
    ctaButton: string;
  };
  privacyPage: {
    eyebrow: string;
    title: string;
    intro: string;
    sections: { heading: string; body: string }[];
    lastUpdated: string;
  };
  notFoundPage: {
    eyebrow: string;
    title: string;
    body: string;
    backHome: string;
    contact: string;
  };
  auth: {
    emailLabel: string;
    passwordLabel: string;
    signInTitle: string;
    signInButton: string;
    loading: string;
    dashboardTitle: string;
  };
  monEspace: {
    layout: {
      todayNav: string;
      overviewNav: string;
      planningNav: string;
      manageNav: string;
      announcementsNav: string;
      myAccount: string;
      signOut: string;
    };
    setPassword: {
      title: string;
      subtitle: string;
      passwordLabel: string;
      confirmLabel: string;
      tooShort: string;
      mismatch: string;
      continueButton: string;
      savingButton: string;
    };
    attendanceStatus: {
      present: string;
      absent: string;
      late: string;
      excused: string;
    };
    sessionStatus: {
      completed: string;
      in_progress: string;
      scheduled: string;
      cancelled: string;
    };
    today: {
      greeting: string;
      sessionsToday: string;
      students: string;
      sessionsThisWeek: string;
      todayHeading: string;
      noSessionsToday: string;
    };
    calendar: {
      title: string;
      previous: string;
      next: string;
      dayLabels: string[];
    };
    sessionDetail: {
      close: string;
      loading: string;
      attendance: string;
      noStudents: string;
      sessionLogHeading: string;
      sessionLogVisibility: string;
      sessionLogPlaceholder: string;
      saving: string;
      save: string;
      nothingLogged: string;
      pickStatus: string;
    };
    overview: {
      title: string;
      upcomingSessions: string;
      noUpcomingSessions: string;
      recentGrades: string;
      noGrades: string;
      recentAttendance: string;
      noAttendance: string;
      sessionLogHeading: string;
    };
    announcements: {
      title: string;
      newButton: string;
      cancelButton: string;
      titlePlaceholder: string;
      messagePlaceholder: string;
      wholeOrg: string;
      pickClass: string;
      publishing: string;
      publishButton: string;
      loading: string;
      none: string;
    };
    notifications: {
      title: string;
      none: string;
    };
    gestion: {
      noOrganization: string;
    };
  };
  callBanner: {
    title: string;
    body: string;
    callCta: string;
    whatsappCta: string;
  };
  needsFinder: {
    label: string;
    title: string;
    body: string;
    items: { icon: "bilingual" | "mission" | "language" | "confidence"; need: string; body: string; linkPage: "activites" | "methodologie"; linkLabel: string }[];
  };
  methodologySteps: {
    label: string;
    title: string;
    body: string;
    steps: { index: string; title: string; body: string }[];
  };
  comparison: {
    label: string;
    title: string;
    withoutLabel: string;
    withLabel: string;
    rows: { without: string; with: string }[];
  };
  faq: {
    label: string;
    title: string;
    items: { question: string; answer: string }[];
  };
  footer: {
    tagline: string;
    activitesTitle: string;
    infoTitle: string;
    contactTitle: string;
    location: string;
    privacyLink: string;
    contactLink: string;
    inscriptionLink: string;
    rights: string;
  };
}
