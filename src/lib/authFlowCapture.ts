// This module is imported directly from main.tsx (the app's eager entry
// point), so it evaluates immediately on page load — well before the
// lazy-loaded Mon Espace chunk (and the Supabase client inside it) even
// starts downloading. That matters: Supabase's own client reads and then
// strips these same URL hash tokens as part of establishing a session, and
// since that client only exists inside the lazy chunk, there's a real race
// between "Supabase processes the hash" and "our own code checks the hash"
// if we only check it from within that same lazy chunk. Capturing it here,
// in the eager bundle, guarantees we always see it first.
const hash = typeof window !== "undefined" ? window.location.hash : "";

export const capturedAuthFlowType: "invite" | "recovery" | null = hash.includes("type=recovery")
  ? "recovery"
  : hash.includes("type=invite")
    ? "invite"
    : null;
