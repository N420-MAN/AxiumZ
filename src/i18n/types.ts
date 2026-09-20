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
  termsPage: {
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
    orDivider: string;
    googleButton: string;
    notInvitedTitle: string;
    notInvitedBody: string;
    backToSignIn: string;
    forgotPasswordLink: string;
    forgotPasswordTitle: string;
    forgotPasswordBody: string;
    sendResetLink: string;
    sending: string;
    resetLinkSent: string;
    loading: string;
    dashboardTitle: string;
    backToWebsite: string;
  };
  monEspace: {
    layout: {
      todayNav: string;
      overviewNav: string;
      planningNav: string;
      manageNav: string;
      announcementsNav: string;
      myAccount: string;
      settingsNav: string;
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
      individualMessage: string;
      roleStudents: string;
      roleParents: string;
      roleTeachers: string;
      roleAdmins: string;
      scopeOrg: string;
      scopeOneClass: string;
      scopeMyClass: string;
      scopeStudents: string;
      noRoleSelectionMeansEveryone: string;
      noStudentsInClasses: string;
      chooseAtLeastOneStudent: string;
      sentBy: string;
    };
    notifications: {
      title: string;
      none: string;
    };
    gestion: {
      noOrganization: string;
      teachersTitle: string;
      specialization: string;
      common: {
        add: string;
        cancel: string;
        save: string;
        saving: string;
        saveEdits: string;
        edit: string;
        delete: string;
        announce: string;
        total: string;
        active: string;
        invite: string;
        inviting: string;
        noEmail: string;
        loading: string;
        noResults: string;
        inviteError: string;
        inviteSuccess: string;
        activeAccount: string;
        noRecordsYet: string;
        announceTo: string;
        sending: string;
        send: string;
      };
      students: {
        title: string;
        searchPlaceholder: string;
        empty: string;
        firstName: string;
        lastName: string;
        studentNumber: string;
        email: string;
        phone: string;
        colName: string;
        colContact: string;
        colClasses: string;
        colEnrolled: string;
        colAccount: string;
        deleteConfirm: string;
      };
      parents: {
        title: string;
        searchPlaceholder: string;
        empty: string;
        colChildren: string;
        colAdded: string;
        linkOptional: string;
        addChild: string;
        confirmChild: string;
        pickStudent: string;
        deleteConfirm: string;
        createError: string;
        linkError: string;
      };
      courses: {
        title: string;
        searchPlaceholder: string;
        empty: string;
        name: string;
        level: string;
        description: string;
        colLevel: string;
        colActiveClasses: string;
        colTotalStudents: string;
        deleteConfirm: string;
      };
      classes: {
        title: string;
        name: string;
        room: string;
        pickCourse: string;
        pickTeacherOptional: string;
        noTeacher: string;
        students: string;
        close: string;
        empty: string;
        deleteConfirm: string;
        enrollStudent: string;
        enroll: string;
        noEnrollments: string;
        remove: string;
        removeConfirm: string;
      };
      terms: {
        title: string;
        description: string;
        namePlaceholder: string;
        start: string;
        end: string;
        current: string;
        currentBadge: string;
        empty: string;
        deleteConfirm: string;
      };
      grades: {
        title: string;
        noClasses: string;
        newAssessment: string;
        titlePlaceholder: string;
        maxScore: string;
        weight: string;
        createAssessment: string;
        noAssessments: string;
        close: string;
        grade: string;
        deleteAssessmentConfirm: string;
        deleteAssessment: string;
        averages: string;
        typeQuiz: string;
        typeTest: string;
        typeExam: string;
        typeProject: string;
        typeOral: string;
      };
      settings: {
        title: string;
        languageTitle: string;
        languageDescription: string;
        profileTitle: string;
        profileDescription: string;
        fullNamePlaceholder: string;
        phonePlaceholder: string;
        profileUpdated: string;
        passwordTitle: string;
        passwordDescription: string;
        newPasswordPlaceholder: string;
        confirmPasswordPlaceholder: string;
        changePassword: string;
        passwordTooShort: string;
        passwordMismatch: string;
        passwordUpdated: string;
      };
      scheduler: {
        scheduledSessions: string;
        schedule: string;
        room: string;
        from: string;
        to: string;
        create: string;
        creating: string;
        noDatesInRange: string;
        noDateForPeriod: string;
        loading: string;
        noSessionsScheduled: string;
        moreSessionsSeePlanning: string;
        confirmCreate: string;
        confirmCreateAnyway: string;
        conflictsDetected: string;
        moreConflicts: string;
        conflictReasonBoth: string;
        conflictReasonTeacher: string;
        conflictReasonRoom: string;
        conflictWith: string;
        createAnyway: string;
        days: { mon: string; tue: string; wed: string; thu: string; fri: string; sat: string; sun: string };
      };
      journal: {
        title: string;
        description: string;
        empty: string;
        loading: string;
        actionCreated: string;
        actionUpdated: string;
        actionDeleted: string;
        unknownUser: string;
        entryLine: string;
        tableStudents: string;
        tableParents: string;
        tableTeachers: string;
        tableCourses: string;
        tableClasses: string;
        tableTerms: string;
        tableAnnouncements: string;
        tableAssessments: string;
        tableGrades: string;
        tableMembers: string;
      };
      admins: {
        title: string;
        description: string;
        empty: string;
        fullNamePlaceholder: string;
        email: string;
        invite: string;
        inviting: string;
        remove: string;
        removeConfirm: string;
        roleSuperAdmin: string;
        roleCenterAdmin: string;
        unnamed: string;
      };
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
    termsLink: string;
    contactLink: string;
    inscriptionLink: string;
    rights: string;
  };
}
