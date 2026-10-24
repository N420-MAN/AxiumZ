import { useEffect, useMemo, useState } from "react";
import { Bar, CartesianGrid, Line, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "../../lib/supabaseClient";
import { useLocale } from "../../i18n/LocaleContext";
import StatTile from "./StatTile";

interface Row {
  user_id: string;
  full_name: string;
  email: string;
  role_name: "super_admin" | "center_admin" | "assistant" | "teacher" | "student" | "parent";
  last_seen_at: string | null;
  logins_this_month: number;
  logins_last_month: number;
}
interface Day {
  day: string;
  connections: number;
  people: number;
}

type SortKey = "name" | "role" | "seen" | "month";
const ROLE_ORDER = ["super_admin", "center_admin", "assistant", "teacher", "student", "parent"] as const;
const ONLINE_MS = 10 * 60 * 1000;

export default function ConnectionsView({ organizationId }: { organizationId: string }) {
  const { t, locale } = useLocale();
  const m = t.monEspace.connections;
  const dateLocale = locale === "en" ? "en-GB" : "fr-FR";

  const [rows, setRows] = useState<Row[]>([]);
  const [daily, setDaily] = useState<Day[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [role, setRole] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "seen", dir: -1 });

  useEffect(() => {
    let alive = true;
    (async () => {
      const [stats, days] = await Promise.all([
        supabase.rpc("connection_stats", { p_organization_id: organizationId }),
        supabase.rpc("connection_daily", { p_organization_id: organizationId, p_days: 30 }),
      ]);
      if (!alive) return;
      setFailed(Boolean(stats.error));
      setRows((stats.data as Row[]) ?? []);
      setDaily((days.data as Day[]) ?? []);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [organizationId]);

  const now = Date.now();
  const tiles = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const seen = (r: Row) => (r.last_seen_at ? new Date(r.last_seen_at).getTime() : 0);
    return {
      today: rows.filter((r) => seen(r) >= startOfToday.getTime()).length,
      week: rows.filter((r) => seen(r) >= Date.now() - 7 * 86400000).length,
      month: rows.reduce((n, r) => n + r.logins_this_month, 0),
      never: rows.filter((r) => !r.last_seen_at).length,
    };
  }, [rows]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rows.filter((r) => (role === "all" || r.role_name === role) && (!q || `${r.full_name} ${r.email}`.toLowerCase().includes(q)));
    const val = (r: Row) =>
      sort.key === "name" ? r.full_name.toLowerCase() : sort.key === "role" ? ROLE_ORDER.indexOf(r.role_name) : sort.key === "month" ? r.logins_this_month : r.last_seen_at ? new Date(r.last_seen_at).getTime() : 0;
    return [...list].sort((a, b) => {
      const x = val(a);
      const y = val(b);
      return (x < y ? -1 : x > y ? 1 : 0) * sort.dir || a.full_name.localeCompare(b.full_name);
    });
  }, [rows, role, query, sort]);

  const maxMonth = Math.max(1, ...rows.map((r) => r.logins_this_month));
  const chart = daily.map((d) => ({ ...d, label: new Date(`${d.day}T12:00:00`).toLocaleDateString(dateLocale, { day: "numeric", month: "short" }) }));

  function ago(iso: string | null): { text: string; online: boolean } {
    if (!iso) return { text: m.never, online: false };
    const then = new Date(iso);
    const diff = now - then.getTime();
    if (diff < ONLINE_MS) return { text: m.online, online: true };
    const mins = Math.round(diff / 60000);
    if (mins < 60) return { text: m.minutesAgo.replace("{n}", String(mins)), online: false };
    const hours = Math.floor(mins / 60);
    const sameDay = then.toDateString() === new Date().toDateString();
    if (sameDay) return { text: m.hoursAgo.replace("{n}", String(hours)), online: false };
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const time = then.toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" });
    if (then.toDateString() === yesterday.toDateString()) return { text: m.yesterday.replace("{time}", time), online: false };
    const days = Math.floor(diff / 86400000);
    return { text: days < 14 ? m.daysAgo.replace("{n}", String(days)) : then.toLocaleDateString(dateLocale, { day: "numeric", month: "short", year: "numeric" }), online: false };
  }

  const head = (key: SortKey, label: string, className = "") => (
    <th className={`px-3 py-2 text-left text-[0.72rem] font-semibold tracking-wide text-gray-500 uppercase ${className}`}>
      <button type="button" onClick={() => setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: key === "name" || key === "role" ? 1 : -1 }))} className="inline-flex items-center gap-1 hover:text-gray-900">
        {label}
        {sort.key === key && <span aria-hidden="true">{sort.dir === 1 ? "↑" : "↓"}</span>}
      </button>
    </th>
  );

  return (
    <div>
      <h2 className="text-[1.15rem] font-extrabold text-gray-900">{m.title}</h2>
      <p className="mt-1 max-w-2xl text-[0.82rem] text-gray-500">{m.description}</p>

      {failed && <p className="mt-4 text-[0.85rem] text-red-600">{m.loadFailed}</p>}

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label={m.activeToday} value={loading ? "…" : tiles.today} tone="green" />
        <StatTile label={m.activeWeek} value={loading ? "…" : tiles.week} />
        <StatTile label={m.loginsMonth} value={loading ? "…" : tiles.month} tone="gold" />
        <StatTile label={m.neverConnected} value={loading ? "…" : tiles.never} tone={tiles.never > 0 ? "red" : "ink"} />
      </div>

      <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
        <h3 className="text-[0.9rem] font-semibold text-gray-900">{m.chartTitle}</h3>
        <div className="mt-3 h-52">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chart} margin={{ top: 5, right: 8, left: -22, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
              <XAxis dataKey="label" interval="preserveStartEnd" minTickGap={24} tick={{ fontSize: 11, fill: "var(--chart-tick)" }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--chart-tick)" }} />
              <Tooltip formatter={(v, name) => [v as number, name === "connections" ? m.chartConnections : m.chartPeople]} />
              <Bar dataKey="connections" fill="var(--chart-navy)" radius={[3, 3, 0, 0]} />
              <Line type="monotone" dataKey="people" stroke="#c8962f" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 flex gap-4 text-[0.74rem] text-gray-500">
          <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-[var(--chart-navy)]" />{m.chartConnections}</span>
          <span className="inline-flex items-center gap-1.5"><i className="h-0.5 w-4 bg-[#c8962f]" />{m.chartPeople}</span>
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {["all", ...ROLE_ORDER].map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRole(r)}
            className={`rounded-full px-3.5 py-1.5 text-[0.78rem] font-semibold transition-colors ${role === r ? "bg-ink text-paper" : "bg-gray-100 text-gray-600 hover:text-gray-900"}`}
          >
            {r === "all" ? m.allRoles : m.roles[r as keyof typeof m.roles]}
          </button>
        ))}
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={m.search} className="ml-auto w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-[0.84rem] sm:w-60" />
      </div>

      <div className="mt-3 overflow-x-auto rounded-2xl border border-gray-200 bg-white">
        <table className="w-full min-w-[640px] text-[0.84rem]">
          <thead className="border-b border-gray-100 bg-gray-50/60">
            <tr>
              {head("name", m.colName)}
              {head("role", m.colRole)}
              {head("seen", m.colLastSeen)}
              {head("month", m.colThisMonth)}
              <th className="px-3 py-2 text-left text-[0.72rem] font-semibold tracking-wide text-gray-500 uppercase">{m.colLastMonth}</th>
            </tr>
          </thead>
          <tbody>
            {!loading && visible.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-gray-400">{m.empty}</td>
              </tr>
            )}
            {visible.map((r) => {
              const a = ago(r.last_seen_at);
              return (
                <tr key={r.user_id} className="border-b border-gray-50 last:border-0">
                  <td className="px-3 py-2.5">
                    <p className="font-medium text-gray-900">{r.full_name}</p>
                    <p className="text-[0.74rem] text-gray-400">{r.email}</p>
                  </td>
                  <td className="px-3 py-2.5 text-gray-600">{m.roles[r.role_name] ?? r.role_name}</td>
                  <td className="px-3 py-2.5" title={r.last_seen_at ? new Date(r.last_seen_at).toLocaleString(dateLocale) : undefined}>
                    {!r.last_seen_at ? (
                      <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-[0.74rem] font-semibold text-red-700">{a.text}</span>
                    ) : (
                      <span className="inline-flex items-center gap-2 text-gray-700">
                        <i className={`h-2 w-2 rounded-full ${a.online ? "bg-green-500" : "bg-gray-300"}`} />
                        {a.text}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-6 font-semibold text-gray-900">{r.logins_this_month}</span>
                      <span className="hidden h-1.5 w-20 rounded-full bg-gray-100 sm:block">
                        <i className="block h-1.5 rounded-full bg-[var(--chart-navy)]" style={{ width: `${(r.logins_this_month / maxMonth) * 100}%` }} />
                      </span>
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-gray-500">{r.logins_last_month}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 max-w-2xl text-[0.74rem] text-gray-400">{m.note}</p>
    </div>
  );
}
