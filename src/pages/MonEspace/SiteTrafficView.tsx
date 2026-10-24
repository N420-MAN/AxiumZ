import { useEffect, useState } from "react";
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "../../lib/supabaseClient";
import { useLocale } from "../../i18n/LocaleContext";
import StatTile from "./StatTile";

interface Stats {
  visitors: number;
  pageviews: number;
  registrations: number;
  events: Record<string, number>;
  daily: { day: string; visitors: number; pageviews: number }[];
  pages: { path: string; views: number; visitors: number }[];
  sources: { source: string; visitors: number }[];
  devices: { device: string; visitors: number }[];
  packs: { label: string; clicks: number }[];
  contact_sources: { label: string; event: string; clicks: number }[];
}

const PERIODS = [7, 30, 90] as const;

/** Horizontal bars: the value is written next to the bar, so no legend is needed. */
function BarList({ items, unit }: { items: { label: string; value: number }[]; unit?: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="mt-3 space-y-2.5">
      {items.map((i) => (
        <li key={i.label}>
          <div className="flex items-baseline justify-between gap-3 text-[0.82rem]">
            <span className="truncate text-gray-700" title={i.label}>{i.label}</span>
            <span className="shrink-0 font-semibold text-gray-900">{i.value}{unit ? <span className="ml-1 font-normal text-gray-400">{unit}</span> : null}</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-gray-100">
            <i className="block h-1.5 rounded-full bg-[var(--chart-navy)]" style={{ width: `${(i.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
      <h3 className="text-[0.9rem] font-semibold text-gray-900">{title}</h3>
      {children}
    </div>
  );
}

export default function SiteTrafficView({ organizationId }: { organizationId: string }) {
  const { t, locale } = useLocale();
  const m = t.monEspace.siteTraffic;
  const dateLocale = locale === "en" ? "en-GB" : "fr-FR";
  const [days, setDays] = useState<number>(30);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.resolve(supabase.rpc("site_stats", { p_organization_id: organizationId, p_days: days })).then(({ data, error }) => {
      if (!alive) return;
      setFailed(Boolean(error));
      setStats((data as Stats) ?? null);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [organizationId, days]);

  const ev = stats?.events ?? {};
  const conversion = stats && stats.visitors > 0 ? `${((stats.registrations / stats.visitors) * 100).toFixed(1)} %` : "–";
  const deviceName = (d: string) => (d === "mobile" ? m.mobile : d === "tablet" ? m.tablet : d === "desktop" ? m.desktop : m.unknown);
  const chart = (stats?.daily ?? []).map((d) => ({ ...d, label: new Date(`${d.day}T12:00:00`).toLocaleDateString(dateLocale, { day: "numeric", month: "short" }) }));
  const v = (n: number | undefined) => (loading ? "…" : (n ?? 0));
  const empty = !loading && (stats?.pageviews ?? 0) === 0;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[1.15rem] font-extrabold text-gray-900">{m.title}</h2>
          <p className="mt-1 max-w-2xl text-[0.82rem] text-gray-500">{m.description}</p>
        </div>
        <div className="flex rounded-xl bg-gray-100 p-1" role="group">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setDays(p)}
              className={`rounded-lg px-3 py-1 text-[0.78rem] font-semibold ${days === p ? "bg-white text-ink shadow-sm" : "text-gray-500"}`}
            >
              {p === 7 ? m.days7 : p === 30 ? m.days30 : m.days90}
            </button>
          ))}
        </div>
      </div>

      {failed && <p className="mt-4 text-[0.85rem] text-red-600">{m.loadFailed}</p>}

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label={m.visitors} value={v(stats?.visitors)} />
        <StatTile label={m.pageviews} value={v(stats?.pageviews)} />
        <StatTile label={m.registrations} value={v(stats?.registrations)} tone="gold" />
        <StatTile label={m.conversion} value={loading ? "…" : conversion} tone="green" />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3">
        <StatTile label={m.inscriptionClicks} value={v(ev.inscription_click)} />
        <StatTile label={m.whatsappClicks} value={v(ev.whatsapp_click)} />
        <StatTile label={m.callClicks} value={v(ev.call_click)} />
      </div>

      <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
        <h3 className="text-[0.9rem] font-semibold text-gray-900">{m.chartTitle}</h3>
        {empty ? (
          <p className="mt-3 text-[0.85rem] text-gray-400">{m.noData}</p>
        ) : (
          <>
            <div className="mt-3 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chart} margin={{ top: 5, right: 8, left: -22, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                  <XAxis dataKey="label" interval="preserveStartEnd" minTickGap={28} tick={{ fontSize: 11, fill: "var(--chart-tick)" }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--chart-tick)" }} />
                  <Tooltip formatter={(val, name) => [val as number, name === "visitors" ? m.visitors : m.pageviews]} />
                  <Bar dataKey="visitors" fill="var(--chart-navy)" radius={[3, 3, 0, 0]} />
                  <Line type="monotone" dataKey="pageviews" stroke="#c8962f" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 flex gap-4 text-[0.74rem] text-gray-500">
              <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-[var(--chart-navy)]" />{m.visitors}</span>
              <span className="inline-flex items-center gap-1.5"><i className="h-0.5 w-4 bg-[#c8962f]" />{m.pageviews}</span>
            </p>
          </>
        )}
      </div>

      {!empty && stats && (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Panel title={m.topPages}>
            <BarList items={stats.pages.map((p) => ({ label: p.path, value: p.views }))} unit={m.views} />
          </Panel>
          <Panel title={m.sources}>
            <BarList items={stats.sources.map((s) => ({ label: s.source === "direct" ? m.direct : s.source, value: s.visitors }))} />
          </Panel>
          <Panel title={m.devices}>
            <BarList items={stats.devices.map((d) => ({ label: deviceName(d.device), value: d.visitors }))} />
          </Panel>
          <Panel title={m.packsTitle}>
            {stats.packs.length === 0 ? <p className="mt-3 text-[0.85rem] text-gray-400">{m.noData}</p> : <BarList items={stats.packs.map((p) => ({ label: p.label, value: p.clicks }))} unit={m.clicks} />}
          </Panel>
          {stats.contact_sources.length > 0 && (
            <Panel title={m.contactTitle}>
              <BarList items={stats.contact_sources.map((c) => ({ label: `${c.event === "whatsapp_click" ? m.whatsappClicks : m.callClicks} · ${c.label}`, value: c.clicks }))} unit={m.clicks} />
            </Panel>
          )}
        </div>
      )}

      <p className="mt-4 max-w-2xl text-[0.74rem] text-gray-400">{m.note}</p>
    </div>
  );
}
