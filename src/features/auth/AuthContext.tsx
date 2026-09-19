import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "../../lib/supabaseClient";

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  preferred_locale: "fr" | "en" | null;
}

export type RoleName = "super_admin" | "center_admin" | "teacher" | "student" | "parent";

export interface Membership {
  organization_id: string;
  organization_name: string;
  role_id: number;
  role_name: RoleName;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  memberships: Membership[];
  isSuperAdmin: boolean;
  /** True while the initial session/profile/memberships are being resolved. */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  // If Supabase isn't configured there's no async check to wait for, so start
  // as "not loading" directly rather than flipping it inside an effect.
  const [loading, setLoading] = useState(isSupabaseConfigured);

  const loadProfileAndMemberships = useCallback(async (userId: string) => {
    const [{ data: profileData, error: profileError }, { data: memberData, error: memberError }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, phone, avatar_url, preferred_locale").eq("id", userId).maybeSingle(),
      supabase
        .from("organization_members")
        .select("organization_id, role_id, organizations(name), roles(name)")
        .eq("user_id", userId),
    ]);

    if (profileError) {
      // eslint-disable-next-line no-console
      console.error("Failed to load profile:", profileError.message);
    }
    setProfile(profileData ?? null);

    if (memberError) {
      // eslint-disable-next-line no-console
      console.error("Failed to load memberships:", memberError.message);
      setMemberships([]);
    } else {
      const rows = (memberData ?? []) as unknown as {
        organization_id: string;
        role_id: number;
        organizations: { name: string } | null;
        roles: { name: string } | null;
      }[];
      setMemberships(
        rows.map((row) => ({
          organization_id: row.organization_id,
          organization_name: row.organizations?.name ?? "—",
          role_id: row.role_id,
          role_name: (row.roles?.name ?? "student") as RoleName,
        })),
      );
    }
  }, []);

  const refresh = useCallback(async () => {
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();
    setSession(currentSession);
    if (currentSession?.user) {
      await loadProfileAndMemberships(currentSession.user.id);
    } else {
      setProfile(null);
      setMemberships([]);
    }
  }, [loadProfileAndMemberships]);

  useEffect(() => {
    let mounted = true;

    if (!isSupabaseConfigured) {
      return;
    }

    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      if (!mounted) return;
      setSession(initialSession);
      if (initialSession?.user) {
        await loadProfileAndMemberships(initialSession.user.id);
      }
      if (mounted) setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      if (newSession?.user) {
        await loadProfileAndMemberships(newSession.user.id);
      } else {
        setProfile(null);
        setMemberships([]);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfileAndMemberships]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const isSuperAdmin = memberships.some((m) => m.role_name === "super_admin");

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        memberships,
        isSuperAdmin,
        loading,
        signIn,
        signOut,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
