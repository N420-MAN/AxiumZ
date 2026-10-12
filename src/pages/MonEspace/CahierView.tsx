import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../features/auth/AuthContext";
import { useLocale } from "../../i18n/LocaleContext";
import { getMaterialSignedUrl } from "../../lib/materialUpload";

const PAGE = 20;

interface ChildOption {
  id: string;
  first_name: string;
  last_name: string;
}
interface SessionRow {
  id: string;
  starts_at: string;
  notes: string | null;
  classes: { name: string } | null;
}
interface MaterialRow {
  id: string;
  title: string;
  file_url: string | null;
  external_url: string | null;
  session_id: string;
}
interface HomeworkRow {
  id: string;
  title: string;
  due_date: string | null;
  session_id: string;
}

// The "cahier de texte": for each past session, what was done, the documents shared
// and the homework given. Read-only, for students and for parents (one tab per child).
export default function CahierView() {
  const { memberships } = useAuth();
  const { locale, t } = useLocale();
  const m = t.monEspace.cahier;
  const dateLocale = locale === "en" ? "en-GB" : "fr-FR";
  const isParent = memberships[0]?.role_name === "parent";

  const [children, setChildren] = useState<ChildOption[]>([]);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [homework, setHomework] = useState<HomeworkRow[]>([]);
  const [classIds, setClassIds] = useState<string[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);

  useEffect(() => {
    async function resolveChildren() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      if (isParent) {
        const { data: parentRow } = await supabase.from("parents").select("id").eq("user_id", userData.user.id).maybeSingle();
        if (parentRow) {
          const { data: links } = await supabase.from("parent_students").select("student_id, students(id, first_name, last_name)").eq("parent_id", parentRow.id);
          const kids = (links ?? []).map((l) => (l as unknown as { students: ChildOption }).students).filter(Boolean);
          setChildren(kids);
          setSelectedChild(kids[0]?.id ?? null);
        }
      } else {
        const { data: studentRow } = await supabase.from("students").select("id, first_name, last_name").eq("user_id", userData.user.id).maybeSingle();
        if (studentRow) {
          setChildren([studentRow]);
          setSelectedChild(studentRow.id);
        }
      }
      setLoading(false);
    }
    resolveChildren();
  }, [isParent]);

  const fetchPage = useCallback(async (ids: string[], offset: number) => {
    const { data: rows } = await supabase
      .from("class_sessions")
      .select("id, starts_at, notes, classes(name)")
      .in("class_id", ids)
      .lt("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: false })
      .range(offset, offset + PAGE - 1);
    const page = (rows as unknown as SessionRow[]) ?? [];
    const sessionIds = page.map((s) => s.id);
    let mats: MaterialRow[] = [];
    let hws: HomeworkRow[] = [];
    if (sessionIds.length > 0) {
      const [{ data: matData }, { data: hwData }] = await Promise.all([
        supabase.from("materials").select("id, title, file_url, external_url, session_id").in("session_id", sessionIds),
        supabase.from("homework").select("id, title, due_date, session_id").in("session_id", sessionIds),
      ]);
      mats = (matData as MaterialRow[]) ?? [];
      hws = (hwData as HomeworkRow[]) ?? [];
    }
    return { page, mats, hws, more: page.length === PAGE };
  }, []);

  useEffect(() => {
    if (!selectedChild) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      const { data: enrolled } = await supabase.from("class_students").select("class_id").eq("student_id", selectedChild);
      const ids = (enrolled ?? []).map((r) => r.class_id);
      if (cancelled) return;
      setClassIds(ids);
      if (ids.length === 0) {
        setSessions([]);
        setMaterials([]);
        setHomework([]);
        setHasMore(false);
        setLoading(false);
        return;
      }
      const r = await fetchPage(ids, 0);
      if (cancelled) return;
      setSessions(r.page);
      setMaterials(r.mats);
      setHomework(r.hws);
      setHasMore(r.more);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [selectedChild, fetchPage]);

  async function loadMore() {
    setLoadingMore(true);
    const r = await fetchPage(classIds, sessions.length);
    setSessions((prev) => [...prev, ...r.page]);
    setMaterials((prev) => [...prev, ...r.mats]);
    setHomework((prev) => [...prev, ...r.hws]);
    setHasMore(r.more);
    setLoadingMore(false);
  }

  async function open(mat: MaterialRow) {
    if (mat.external_url) {
      window.open(mat.external_url, "_blank", "noopener,noreferrer");
      return;
    }
    if (mat.file_url) {
      setOpeningId(mat.id);
      const url = await getMaterialSignedUrl(mat.file_url);
      setOpeningId(null);
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  // Sessions with nothing logged are left out: the cahier lists what was actually written down.
  const entries = sessions
    .map((s) => ({ s, mats: materials.filter((x) => x.session_id === s.id), hws: homework.filter((x) => x.session_id === s.id) }))
    .filter((e) => (e.s.notes && e.s.notes.trim()) || e.mats.length > 0 || e.hws.length > 0);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8 sm:py-10">
      <h1 className="font-display text-[1.5rem] font-bold text-gray-900">{m.title}</h1>
      <p className="mt-1 text-[0.85rem] text-gray-500">{m.intro}</p>

      {isParent && children.length > 1 && (
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label={m.childLabel}>
          {children.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedChild(c.id)}
              className={`rounded-full px-3.5 py-1.5 text-[0.82rem] font-medium ${selectedChild === c.id ? "bg-gradient-to-br from-ink to-ink-soft text-paper" : "bg-gray-100 text-gray-600"}`}
            >
              {c.first_name} {c.last_name}
            </button>
          ))}
        </div>
      )}
      {isParent && children.length === 1 && (
        <p className="mt-2 text-[0.88rem] text-gray-500">
          {children[0].first_name} {children[0].last_name}
        </p>
      )}

      {loading ? (
        <div className="mt-8 h-40" />
      ) : entries.length === 0 ? (
        <p className="mt-8 text-[0.88rem] text-gray-400">{m.empty}</p>
      ) : (
        <div className="mt-6 space-y-3">
          {entries.map(({ s, mats, hws }) => (
            <article key={s.id} className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-[0.8rem] font-medium text-gray-700">
                {s.classes?.name} — {new Date(s.starts_at).toLocaleDateString(dateLocale, { weekday: "long", day: "numeric", month: "long" })}
              </p>

              {s.notes && s.notes.trim() && (
                <div className="mt-2.5">
                  <h2 className="text-[0.74rem] font-semibold uppercase tracking-wide text-gray-400">{m.done}</h2>
                  <p className="mt-0.5 whitespace-pre-wrap break-words text-[0.87rem] text-gray-800">{s.notes}</p>
                </div>
              )}

              {mats.length > 0 && (
                <div className="mt-3">
                  <h2 className="text-[0.74rem] font-semibold uppercase tracking-wide text-gray-400">{m.documents}</h2>
                  <div className="mt-1 space-y-1">
                    {mats.map((mat) => (
                      <div key={mat.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-gray-50 px-3 py-1.5">
                        <span className="min-w-0 break-words text-[0.85rem] text-gray-800">{mat.title}</span>
                        <button type="button" onClick={() => open(mat)} disabled={openingId === mat.id} className="shrink-0 text-[0.78rem] text-gray-600 hover:text-gray-900 hover:underline disabled:opacity-50">
                          {m.open}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {hws.length > 0 && (
                <div className="mt-3">
                  <h2 className="text-[0.74rem] font-semibold uppercase tracking-wide text-gray-400">{m.homework}</h2>
                  <ul className="mt-1 space-y-0.5">
                    {hws.map((hw) => (
                      <li key={hw.id} className="text-[0.85rem] text-gray-800">
                        {hw.title}
                        {hw.due_date && (
                          <span className="ml-1.5 text-[0.76rem] text-gray-400">
                            {t.monEspace.homework.dueOn.replace("{date}", new Date(hw.due_date).toLocaleDateString(dateLocale, { day: "numeric", month: "short" }))}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {!loading && hasMore && (
        <button type="button" onClick={loadMore} disabled={loadingMore} className="mt-5 text-[0.85rem] text-gray-600 hover:text-gray-900 hover:underline disabled:opacity-50">
          {m.loadMore}
        </button>
      )}
    </div>
  );
}
