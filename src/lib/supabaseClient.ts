import { createClient } from "@supabase/supabase-js";

// Hardcoded directly rather than read from environment variables — this
// removes any dependency on the hosting platform's env-var configuration
// being set correctly (which caused the earlier blank-page deployment issue).
// This is safe: the publishable key is designed to be exposed client-side,
// the same way any public API key is; it has no elevated privileges and
// every table it can reach is still governed by RLS policies in Postgres.
const supabaseUrl = "https://aashhsdhdwjjbhsxzyvf.supabase.co";
const supabaseAnonKey = "sb_publishable_whMLF0sv6ffQe4sNlR7taw__oi_vjy_";

export const isSupabaseConfigured = true;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
