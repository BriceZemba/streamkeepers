import { useEffect, useMemo, useRef, useState } from "react";
import { CITIES } from "../domain/siteFacts";
import { distanceM, getPosition } from "../domain/geo";
import type { Draft } from "../domain/store";
import { useI18n } from "../i18n";
import { missionLink, reminderIcs } from "../domain/reminder";
import { downloadIcs, shareLink } from "./actions";
import { MissionMap } from "./MissionMap";
import { band, fold, type Mission } from "./useMissions";

type Area = string; // city id, or "CITIZEN"
type Sort = "needed" | "nearest";
type Near = { state: "idle" | "locating" | "none" } | { state: "fix"; lat: number; lon: number };

export interface MissionsProps {
  missions: Mission[];
  simulated: boolean;
  adopted: string | null;
  draft: Draft | null;
  draftTotalSteps: number;
  onStart: (m: Mission) => void;
  onAdopt: (code: string | null) => void;
  onResume: () => void;
  onDiscard: () => void;
  focusCode?: string | null;
}

export function MissionsView({ missions, simulated, adopted, draft, draftTotalSteps, onStart, onAdopt, onResume, onDiscard, focusCode }: MissionsProps) {
  const { t, num } = useI18n();
  const [area, setArea] = useState<Area>(() => missions.find((m) => m.site.code === focusCode)?.site.cityId ?? "CO");
  const [selected, setSelected] = useState<string | null>(focusCode ?? null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("needed");
  const [near, setNear] = useState<Near>({ state: "idle" });

  const chooseSort = async (s: Sort) => {
    setSort(s);
    if (s === "nearest" && near.state !== "fix") {
      setNear({ state: "locating" });
      const p = await getPosition();
      setNear(p ? { state: "fix", lat: p.lat, lon: p.lon } : { state: "none" });
    }
  };

  const q = fold(query.trim());
  const listed = useMemo(() => {
    if (q) return missions.filter((m) => fold(`${m.site.name} ${m.site.cityName ?? ""} ${m.site.code}`).includes(q)).slice(0, 20);
    if (sort === "nearest" && near.state === "fix") {
      return missions
        .map((m) => ({ m, d: distanceM(near.lat, near.lon, m.site.lat, m.site.lon) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, 10)
        .map(({ m }) => m);
    }
    return missions.filter((m) => (area === "CITIZEN" ? m.site.kind === "citizen" : m.site.cityId === area));
  }, [missions, q, sort, near, area]);

  const byAreaMode = !q && !(sort === "nearest" && near.state === "fix");
  const current = missions.find((m) => m.site.code === selected) ?? null;
  const mine = adopted ? missions.find((m) => m.site.code === adopted) : undefined;
  const needed = byAreaMode ? listed.filter((m) => m.checksThisSeason < 3 && m.site.code !== adopted).slice(0, 10) : listed;
  const covered = byAreaMode ? listed.filter((m) => m.checksThisSeason >= 3 && m.site.code !== adopted) : [];
  const areaName = area === "CITIZEN" ? t("missions.citizenSites") : CITIES.find((c) => c.id === area)?.name ?? "";
  const dist = (m: Mission) => {
    if (near.state !== "fix") return undefined;
    const d = distanceM(near.lat, near.lon, m.site.lat, m.site.lon);
    return t("missions.away", { d: d < 1000 ? `${num(Math.round(d / 10) * 10)} m` : `${num(d / 1000, d < 10_000 ? 1 : 0)} km` });
  };

  return (
    <>
      <div className="map-wrap">
        <MissionMap missions={current ? [current, ...listed.filter((m) => m !== current)] : listed} selected={current} onSelect={setSelected} label={t("missions.mapLabel")} />
      </div>
      <section className="sheet" aria-label={t("nav.missions")}>
        {current ? (
          <MissionDetail mission={current} adopted={adopted === current.site.code} onAdopt={onAdopt} onStart={() => onStart(current)} onClose={() => setSelected(null)} />
        ) : (
          <>
            {draft && (
              <div className="resume" role="status">
                <p>{t("missions.resume", { site: missions.find((m) => m.site.code === draft.siteCode)?.site.name ?? draft.siteCode, step: Math.min(draft.stepIdx + 1, draftTotalSteps), total: draftTotalSteps })}</p>
                <span className="row">
                  <button className="btn btn-primary btn-sm" onClick={onResume}>{t("missions.resumeBtn")}</button>
                  <button className="btn btn-quiet btn-sm" onClick={onDiscard}>{t("missions.discard")}</button>
                </span>
              </div>
            )}

            <div className="toolbar">
              <label className="search">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
                <span className="visually-hidden">{t("missions.search")}</span>
                <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("missions.search")} enterKeyHint="search" />
              </label>
              <div className="seg" role="group" aria-label="Sort">
                <button aria-pressed={sort === "needed"} onClick={() => chooseSort("needed")}>{t("missions.sortNeeded")}</button>
                <button aria-pressed={sort === "nearest"} onClick={() => chooseSort("nearest")}>{t("missions.sortNearest")}</button>
              </div>
            </div>

            {sort === "nearest" && near.state === "locating" && <p className="info-line">{t("missions.locating")}</p>}
            {sort === "nearest" && near.state === "none" && <p className="info-line">{t("missions.noPosition")}</p>}

            {byAreaMode && (
              <div className="areas" role="tablist" aria-label="Area">
                {[...CITIES.map((c) => ({ id: c.id, name: c.name })), { id: "CITIZEN", name: t("missions.citizenSites") }].map((c) => (
                  <button key={c.id} role="tab" aria-selected={area === c.id} className="area" onClick={() => { setArea(c.id); setSelected(null); }}>
                    {c.name}
                  </button>
                ))}
              </div>
            )}

            {mine && byAreaMode && (
              <>
                <p className="eyebrow" style={{ marginBottom: 2 }}>{t("missions.yourStream")}</p>
                <MissionList missions={[mine]} onSelect={setSelected} adopted={adopted} />
                <div style={{ height: 18 }} />
              </>
            )}

            <div className="section-head">
              <div>
                <p className="eyebrow">{q ? "" : t("missions.eyebrow", { area: byAreaMode ? areaName : t("missions.sortNearest") })}</p>
                <h2>{q ? t("missions.searchTitle", { q: query.trim() }) : byAreaMode ? t("missions.title") : t("missions.nearestTitle")}</h2>
              </div>
            </div>

            {simulated && covered.length > 0 && (
              <p className="sim-note" role="note">
                <span aria-hidden="true">◐</span>
                <span><b>{t("missions.simLead")}</b> {t("missions.simNote")}</span>
              </p>
            )}

            {q && listed.length === 0 ? (
              <p className="empty">{t("missions.noResults", { q: query.trim() })}</p>
            ) : (
              <MissionList missions={needed} onSelect={setSelected} adopted={adopted} distance={sort === "nearest" ? dist : undefined} />
            )}

            {covered.length > 0 && (
              <>
                <div className="section-head" style={{ marginTop: 28 }}>
                  <div>
                    <p className="eyebrow">{t("missions.coveredEyebrow")}</p>
                    <h3>{t("missions.coveredTitle")}</h3>
                  </div>
                </div>
                <MissionList missions={covered} onSelect={setSelected} adopted={adopted} muted />
              </>
            )}
          </>
        )}
      </section>
    </>
  );
}

function Token({ points, size }: { points: number; size?: "xl" }) {
  const { t } = useI18n();
  return (
    <span className={`token token-${band(points)}${size ? ` token-${size}` : ""}`} aria-label={t("points", { n: points })}>
      <span>{points}<small>{t("pts")}</small></span>
    </span>
  );
}

function MissionList({ missions, onSelect, muted, adopted, distance }: { missions: Mission[]; onSelect: (code: string) => void; muted?: boolean; adopted: string | null; distance?: (m: Mission) => string | undefined }) {
  const { t } = useI18n();
  return (
    <ol className={`missions${muted ? " is-muted" : ""}`}>
      {missions.map((m) => (
        <li key={m.site.code}>
          <button className="mission" onClick={() => onSelect(m.site.code)}>
            <Token points={m.value.points} />
            <span>
              <span className="mission-title">
                {m.site.name}
                {m.site.code === adopted && <span className="adopted-badge">♥ {t("detail.adopted")}</span>}
              </span>
              <span className="mission-sub" style={{ display: "block" }}>
                {[distance?.(m), m.site.cityName, headline(m, t)].filter(Boolean).join(" · ")}
              </span>
            </span>
            {muted ? <span className="pill pill-sim">{m.checksThisSeason}×</span> : <span className="chev" aria-hidden="true">→</span>}
          </button>
        </li>
      ))}
    </ol>
  );
}

/** One-line summary for the list. Lab staleness is similar at almost every site
 * (all public lab campaigns are 2023–24), so lead with what differs. */
function headline(m: Mission, t: ReturnType<typeof useI18n>["t"]): string {
  const bits = [m.checksThisSeason > 0 ? t("missions.headChecked", { n: m.checksThisSeason }) : t("missions.headNone")];
  if (m.site.labRiskScore !== null) bits.push(t("missions.labRisk", { score: m.site.labRiskScore.toFixed(2) }));
  else if (m.site.kind === "citizen") bits.push(t("missions.noLab"));
  return bits.join(" · ");
}

function MissionDetail({ mission, adopted, onAdopt, onStart, onClose }: { mission: Mission; adopted: boolean; onAdopt: (code: string | null) => void; onStart: () => void; onClose: () => void }) {
  const { t, tm, lang } = useI18n();
  const { site, value } = mission;
  const [toast, setToast] = useState<string | null>(null);
  const [manualLink, setManualLink] = useState(false);
  const link = missionLink(location.href, site.code, lang);
  const remind = () =>
    downloadIcs(
      `streamkeepers-${site.code}.ics`,
      reminderIcs({
        siteCode: site.code, siteName: site.name, lat: site.lat, lon: site.lon, url: link, now: new Date(), seasonal: adopted,
        title: t("remind.title", { site: site.name }),
        description: adopted ? t("remind.descSeason", { site: site.name }) : t("remind.descOnce", { site: site.name, n: value.points }),
      }),
    );
  const invite = async () => {
    const r = await shareLink({ title: "StreamKeepers", text: t("share.text", { site: site.name, n: value.points }), url: link });
    if (r === "copied") {
      setToast(t("detail.copied"));
      setTimeout(() => setToast(null), 2500);
    } else if (r === "failed") {
      setManualLink(true); // no share sheet and no clipboard access: let the user copy it
    }
  };
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [site.code]);
  const parts = value.parts.filter((p) => p.points > 0 || p.key === "coverage");
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${site.lat},${site.lon}&travelmode=walking`;
  return (
    <article className="detail" aria-labelledby="mc-h" ref={ref}>
      <button className="back" onClick={onClose}>← {t("detail.back")}</button>
      <header className="detail-head">
        <div>
          <p className="eyebrow">{site.cityName ?? t("detail.citizenSite")} · {site.kind === "research" ? t("detail.research", { code: site.code }) : t("detail.citizen")}</p>
          <h1 id="mc-h">{site.name}</h1>
        </div>
        <Token points={value.points} size="xl" />
      </header>

      <div className="detail-actions">
        <a className="btn btn-soft" href={directions} target="_blank" rel="noreferrer">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 11l18-8-8 18-2-8z" /></svg>
          {t("detail.directions")}
        </a>
        <button className="btn btn-soft" aria-pressed={adopted} onClick={() => onAdopt(adopted ? null : site.code)} title={t("detail.adoptHint")}>
          {adopted ? `♥ ${t("detail.adopted")}` : `♡ ${t("detail.adopt")}`}
        </button>
        <button className="btn btn-soft" onClick={remind}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4M12 13v4M10 15h4" /></svg>
          {t("detail.remind")}
        </button>
        <button className="btn btn-soft" onClick={invite}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5M19 8v6M16 11h6" /></svg>
          {t("detail.invite")}
        </button>
      </div>
      {toast && <p className="toast" role="status">{toast}</p>}
      {manualLink && (
        <label className="field" style={{ marginTop: -6 }}>
          {t("detail.copyThis")}
          <input readOnly value={link} onFocus={(e) => e.currentTarget.select()} autoFocus />
        </label>
      )}

      <h3 style={{ marginBottom: 10 }}>{t("detail.why", { n: value.points })}</h3>
      <ul className="ledger">
        {parts.map((p) => (
          <li key={p.key}>
            <span className="lead">{tm(p.msg, p.reason)}</span>
            <span className={`amt${p.key === "coverage" ? " down" : ""}`}>{p.key === "coverage" ? t("detail.less") : `+${p.points}`}</span>
          </li>
        ))}
        <li className="total"><span className="lead">{t("detail.total")}</span><span className="amt">{value.points}</span></li>
      </ul>

      <p className="promise">{t("detail.promise")}</p>

      <button className="btn btn-primary btn-block" onClick={onStart}>{t("detail.start")} <span aria-hidden="true">→</span></button>
      <p className="tiny muted" style={{ textAlign: "center", marginTop: 10 }}>{t("detail.meta")}</p>
    </article>
  );
}
