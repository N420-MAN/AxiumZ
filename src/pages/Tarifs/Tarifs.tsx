import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useLocale } from "../../i18n/LocaleContext";
import { pathFor } from "../../i18n/config";
import { usePageMeta } from "../../hooks/usePageMeta";
import { BRAND } from "../../data/brand";
import { trackEvent } from "../../lib/analytics";
import { money } from "../../lib/discount";
import { offerOf, percentOff, perMonth, savingOf, tiersOf, usePublicPricing, type PublicPack } from "../../lib/publicPricing";
import PageHero from "../../components/Hero/PageHero";
import Reveal from "../../components/RevealText/Reveal";

interface Card {
  key: string;
  kind: string;
  size: number;
  solo: boolean;
  packs: PublicPack[];
  best: boolean;
}

export default function Tarifs() {
  const { t, locale } = useLocale();
  const p = t.tarifsPage;
  usePageMeta(`${p.meta.title} — AxiumZ`, p.meta.description, "tarifs");

  const { programs, loading, failed } = usePublicPricing();
  const [programId, setProgramId] = useState("");
  const [levelId, setLevelId] = useState("");

  // Default to the first programme / level as soon as the prices arrive.
  useEffect(() => {
    if (!programId && programs.length > 0) setProgramId(programs[0].id);
  }, [programs, programId]);

  const program = programs.find((x) => x.id === programId) ?? null;
  useEffect(() => {
    if (program && !program.levels.some((l) => l.id === levelId)) setLevelId(program.levels[0]?.id ?? "");
  }, [program, levelId]);
  const level = program?.levels.find((l) => l.id === levelId) ?? null;

  const inscriptionPath = pathFor(locale, "inscription");
  // One card per size (Solo, Duo, Trio…); the combination of subjects is picked inside the card.
  const [sel, setSel] = useState<Record<string, string>>({});
  const cards = useMemo<Card[]>(() => {
    if (!level) return [];
    const list: Card[] = [];
    if (level.solo) list.push({ key: `solo-${level.id}`, kind: p.soloBadge, size: 1, solo: true, packs: [], best: false });
    const tiers = tiersOf(level.packs);
    let bestKey = "";
    let bestSave = 0;
    for (const tier of tiers) {
      const save = Math.max(...tier.packs.map(savingOf));
      if (save > bestSave) {
        bestSave = save;
        bestKey = `${level.id}:${tier.size}`;
      }
    }
    for (const tier of tiers) {
      const key = `${level.id}:${tier.size}`;
      list.push({ key, kind: tier.kind, size: tier.size, solo: false, packs: tier.packs, best: key === bestKey });
    }
    return list;
  }, [level, p.soloBadge]);

  // The biggest saving across everything published, for the banner.
  const banner = useMemo(() => {
    let best = 0;
    let name = "";
    for (const pr of programs) {
      for (const lv of pr.levels) {
        for (const pk of lv.packs) {
          const o = offerOf(pk);
          if (o && pk.price - o.price > best) {
            best = pk.price - o.price;
            name = o.name;
          }
        }
      }
    }
    return best > 0 ? p.banner.replace("{name}", name).replace("{amount}", money(best, locale)) : null;
  }, [programs, locale, p.banner]);

  const pill = (active: boolean) =>
    `rounded-full border px-5 py-2.5 text-[0.92rem] font-semibold transition-colors ${
      active ? "border-ink bg-ink text-paper" : "border-ink/20 bg-paper text-ink hover:border-ink"
    }`;

  return (
    <>
      <PageHero eyebrow={p.hero.eyebrow} title={p.hero.title} body={p.hero.body} variant="coupon" />

      <section className="relative bg-paper px-4 py-16 text-ink sm:px-6 sm:py-24">
        <div className="pattern-grid-light pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />
        <div className="container-editorial relative !max-w-[74rem] !px-0">
          {banner && (
            <Reveal>
              <p className="mb-10 inline-flex max-w-full items-center gap-3 rounded-xl border border-accent/40 bg-accent-soft px-5 py-3 text-[0.95rem] font-semibold text-ink">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                {banner}
              </p>
            </Reveal>
          )}

          {loading && <p role="status" className="text-graphite">{p.loading}</p>}
          {failed && (
            <p role="alert" className="rounded-xl border border-red/30 bg-red/5 px-5 py-4 text-red">
              {p.failed.replace("{phone}", BRAND.phoneDisplay)}
            </p>
          )}
          {!loading && !failed && programs.length === 0 && <p className="text-graphite">{p.empty}</p>}

          {programs.length > 0 && (
            <>
              <div className="flex flex-wrap items-center gap-x-8 gap-y-5">
                <div role="group" aria-label={p.programLabel} className="flex flex-wrap gap-2">
                  {programs.map((pr) => (
                    <button key={pr.id} type="button" aria-pressed={pr.id === programId} onClick={() => setProgramId(pr.id)} className={pill(pr.id === programId)}>
                      {pr.name}
                    </button>
                  ))}
                </div>
              </div>
              {program && (
                <div role="group" aria-label={p.levelLabel} className="mt-5 flex flex-wrap gap-2">
                  {program.levels.map((lv) => (
                    <button
                      key={lv.id}
                      type="button"
                      aria-pressed={lv.id === levelId}
                      onClick={() => setLevelId(lv.id)}
                      className={`rounded-lg border px-4 py-2 text-[0.88rem] font-medium transition-colors ${
                        lv.id === levelId ? "border-accent bg-accent text-ink" : "border-ink/15 bg-paper text-graphite hover:border-ink/40"
                      }`}
                    >
                      {lv.name}
                    </button>
                  ))}
                </div>
              )}

              <ul className="mt-12 grid grid-cols-1 gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
                {cards.map((c, i) => {
                  const chosen = c.packs.find((k) => k.id === sel[c.key]) ?? c.packs[0] ?? null;
                  const src = c.solo ? level?.solo ?? null : chosen;
                  if (!src) return null;
                  const o = offerOf(src);
                  const price = src.price;
                  const offerName = o?.name ?? null;
                  const offerPrice = o?.price ?? null;
                  const pay = offerPrice ?? price;
                  const samePrice = c.packs.every((k) => k.price === c.packs[0].price && (offerOf(k)?.price ?? k.price) === (offerOf(c.packs[0])?.price ?? c.packs[0].price));
                  const href = c.solo ? `${inscriptionPath}?level=${levelId}&formula=subject` : `${inscriptionPath}?pack=${chosen?.id}`;
                  return (
                    <li key={c.key}>
                      <Reveal delay={Math.min(i, 5) * 0.05} className="h-full">
                        <article className={`card-note relative flex h-full flex-col p-6 sm:p-7 ${c.solo ? "!bg-paper-soft" : "!bg-white"} ${c.best ? "!shadow-[8px_8px_0_var(--color-accent)]" : ""}`}>
                          {c.best && (
                            <span className="font-hand absolute -top-4 right-4 rotate-3 rounded-md bg-red px-4 py-1 text-[1.4rem] leading-none font-bold text-white shadow-[3px_3px_0_#7d2524]">{p.bestOffer}</span>
                          )}
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-display rounded-md bg-ink px-2.5 py-1 text-[0.72rem] font-bold uppercase tracking-[0.08em] text-paper">{c.kind}</span>
                            {offerPrice != null && (
                              <span className="-rotate-3 rounded-md bg-red px-3 py-1 text-[0.8rem] font-bold text-white">{p.savePct.replace("{pct}", String(percentOff(price, offerPrice)))}</span>
                            )}
                          </div>
                          <h3 className="font-display mt-5 text-[1.5rem] leading-tight font-extrabold tracking-[-0.02em]">{c.solo ? p.soloTitle : p.tierTitle.replace("{n}", String(c.size))}</h3>

                          {c.solo ? (
                            <p className="mt-3 text-[0.95rem] leading-relaxed text-[#1b2f57]">{p.soloSub}</p>
                          ) : c.packs.length > 1 ? (
                            <div className="mt-4" role="group" aria-label={p.chooseSubjects}>
                              <p className="text-[0.88rem] text-graphite">{p.chooseSubjects}</p>
                              <div className="mt-2 flex flex-col gap-2">
                                {c.packs.map((k) => (
                                  <button
                                    key={k.id}
                                    type="button"
                                    aria-pressed={k.id === chosen?.id}
                                    onClick={() => setSel({ ...sel, [c.key]: k.id })}
                                    className={`rounded-full border-2 border-ink px-4 py-2 text-left text-[0.92rem] font-semibold transition-transform hover:-translate-y-0.5 ${k.id === chosen?.id ? "bg-ink text-paper" : "bg-paper text-ink"}`}
                                  >
                                    {k.subjects.join(" + ") || k.name}
                                    {!samePrice && <span className="ml-2 text-[0.8rem] font-medium opacity-80">· {money(offerOf(k)?.price ?? k.price, locale)}</span>}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <p className="mt-3 text-[0.95rem] leading-relaxed text-[#1b2f57]">{(chosen?.subjects ?? []).join(" + ")}</p>
                          )}

                          <div className="mt-auto pt-6">
                            {offerName && offerPrice != null && <p className="font-hand text-[1.5rem] leading-none font-bold text-red">{offerName}</p>}
                            <p className="mt-1 flex flex-wrap items-baseline gap-x-3">
                              <span className="font-display text-[2.4rem] leading-none font-extrabold tracking-[-0.03em]">{money(pay, locale)}</span>
                              {offerPrice != null && <s className="text-[1rem] text-graphite/70">{money(price, locale)}</s>}
                            </p>
                            <p className="mt-2 text-[0.88rem] text-graphite">
                              {p.perTrimester} · {p.perMonth.replace("{amount}", money(perMonth(pay), locale))}
                            </p>
                            {offerPrice != null && <p className="mt-1 text-[0.88rem] font-semibold text-ink">{p.saveAmount.replace("{amount}", money(price - offerPrice, locale))}</p>}
                            <Link
                              to={href}
                              onClick={() => trackEvent("pack_choose", { pack: chosen?.name ?? c.kind })}
                              className="font-display btn-sticker mt-5 inline-flex w-full items-center justify-center rounded-md bg-ink px-5 py-3.5 text-[0.95rem] font-semibold text-paper [--sticker:var(--color-accent)]"
                            >
                              {c.solo ? p.chooseSolo : p.choosePack}
                            </Link>
                          </div>
                        </article>
                      </Reveal>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-8 max-w-3xl text-[0.82rem] leading-relaxed text-graphite">{p.note}</p>
            </>
          )}
        </div>
      </section>

      <section className="grain-texture relative bg-ink px-4 py-16 text-paper sm:px-6 sm:py-20">
        <div className="container-editorial relative !max-w-[74rem] !px-0 text-center">
          <Reveal>
            <h2 className="font-display text-[1.8rem] font-extrabold sm:text-[2.2rem]">{p.ctaTitle}</h2>
            <p className="mx-auto mt-4 max-w-xl text-[1rem] text-mist">{p.ctaBody}</p>
            <a
              href={BRAND.whatsappUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => trackEvent("whatsapp_click", { source: "tarifs_page" })}
              className="font-display mt-7 inline-flex items-center justify-center rounded-full bg-accent px-7 py-3.5 text-[0.95rem] font-semibold text-ink transition-colors hover:bg-accent-bright"
            >
              {p.ctaButton}
            </a>
          </Reveal>
        </div>
      </section>
    </>
  );
}
