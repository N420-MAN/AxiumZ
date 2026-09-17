import { motion } from "framer-motion";
import { useLocale } from "../../i18n/LocaleContext";
import { useAuth } from "../../features/auth/AuthContext";
import AdminPanel from "./AdminPanel";
import MyClasses from "./MyClasses";

const EASE = [0.16, 1, 0.3, 1] as const;

export default function Dashboard() {
  const { t } = useLocale();
  const a = t.auth;
  const { profile, memberships, isSuperAdmin, signOut } = useAuth();

  return (
    <section className="grain-texture relative min-h-screen overflow-hidden bg-ink px-4 py-16 text-paper sm:px-6 sm:py-24">
      <div className="pattern-grid-dark pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />
      <div className="container-editorial relative !max-w-[900px] !px-0">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="flex flex-col items-start justify-between gap-6 border-b border-line-dark pb-8 sm:flex-row sm:items-end"
        >
          <div>
            <span className="text-[0.85rem] text-mist">{a.dashboardTitle}</span>
            <h1 className="font-display mt-2 text-[1.8rem] font-extrabold sm:text-[2.2rem]">
              {a.welcomeBack}
              {profile?.full_name ? `, ${profile.full_name}` : ""}
            </h1>
            {isSuperAdmin && (
              <span className="mt-2 inline-block rounded-full bg-accent px-3 py-1 text-[0.75rem] font-semibold text-ink">
                {a.roleNames.super_admin}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => signOut()}
            className="rounded-full border border-paper/20 px-5 py-2.5 text-[0.88rem] font-medium text-paper transition-colors hover:border-paper/40"
          >
            {a.signOutButton}
          </button>
        </motion.div>

        <div className="mt-10">
          {memberships.length === 0 ? (
            <p className="max-w-md text-[0.95rem] leading-relaxed text-mist">{a.noMemberships}</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {memberships.map((m, i) => (
                <motion.div
                  key={m.organization_id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 + i * 0.06, ease: EASE }}
                  className="rounded-2xl border border-paper/10 bg-paper/[0.04] p-6"
                >
                  <span className="text-[0.78rem] text-mist">{a.yourOrganization}</span>
                  <h3 className="font-display mt-1 text-[1.2rem] font-extrabold">{m.organization_name}</h3>
                  <span className="mt-3 inline-block rounded-full bg-ink-soft px-3 py-1 text-[0.78rem] font-semibold text-accent-bright">
                    {a.roleNames[m.role_name]}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <MyClasses />

        {memberships
          .filter((m) => m.role_name === "center_admin" || isSuperAdmin)
          .map((m) => (
            <AdminPanel key={m.organization_id} organizationId={m.organization_id} />
          ))}
      </div>
    </section>
  );
}
