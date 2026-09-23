import { seasonOf } from "../domain/missionValue";
import { DEFAULT_WEIGHTS } from "../domain/missionValue";
import type { Keeper, StoredCheck, Streak } from "../domain/store";
import { FHIR_SERVERS, type ServerKey } from "../fhir/client";
import { useI18n } from "../i18n";
import { Contours } from "./glyphs";
import { missionLink, reminderIcs } from "../domain/reminder";
import { downloadIcs } from "./actions";

export interface Settings {
  practice: boolean;
  simulated: boolean;
  server: ServerKey;
}

export function KeeperView({ keeper, checks, siteName, siteGeo, streak, settings, onSettings, onName, onReset, onRetry, onOpenSite }: {
  keeper: Keeper;
  checks: StoredCheck[];
  siteName: (code: string) => string;
  siteGeo: (code: string) => { lat: number; lon: number } | undefined;
  streak: Streak;
  settings: Settings;
  onSettings: (s: Settings) => void;
  onName: (name: string) => void;
  onReset: () => void;
  onRetry: (id: string) => void;
  onOpenSite: (code: string) => void;
}) {
  const { t, lang } = useI18n();
  const total = checks.reduce((s, c) => s + c.creditedPoints, 0);
  const held = checks.filter((c) => c.gate.outcome === "REVIEW").length;
  const streams = new Set(checks.map((c) => c.siteCode)).size;
  const locale = lang === "pt" ? "pt-PT" : lang === "fr" ? "fr-FR" : "en-GB";
  return (
    <section className="journal" aria-labelledby="keeper-h">
      <div className="journal-hero">
        <Contours className="contours" />
        <p className="eyebrow">{keeper.name ? t("journal.eyebrowName", { name: keeper.name }) : t("journal.eyebrow")}</p>
        <div className="big-num" aria-label={t("points", { n: total })}>{total}</div>
        <h1 id="keeper-h" style={{ fontSize: "1.1rem", fontWeight: 500, color: "#d8e0db" }}>{t("journal.pointsFor")}</h1>
        <div className="stats">
          <div><strong>{checks.length}</strong><span>{t("journal.checks")}</span></div>
          <div><strong>{streams}</strong><span>{t("journal.streams")}</span></div>
          <div><strong>{held}</strong><span>{t("journal.review")}</span></div>
        </div>
      </div>

      <div className="adopt-card">
        <p className="eyebrow">{t("journal.adoptTitle")}</p>
        {keeper.adopted ? (
          <>
            <h3>♥ {siteName(keeper.adopted)} {streak.count > 0 && <span className="adopted-badge">{t("journal.streak", { n: streak.count })}</span>}</h3>
            <div className="seasons" aria-label={t("journal.streak", { n: streak.count })}>
              {streak.recent.map((r, i) => {
                const s = seasonOf(r.ordinal);
                return (
                  <span key={r.ordinal} className={`${r.done ? "done" : ""}${i === streak.recent.length - 1 ? " now" : ""}`}>
                    {r.done ? "✓ " : ""}{t(`season.${s.name}`)} {String(s.year).slice(2)}
                  </span>
                );
              })}
            </div>
            <p className="small muted" style={{ margin: "0 0 10px" }}>
              {streak.dueThisSeason ? t("journal.due", { n: DEFAULT_WEIGHTS.adopted }) : t("journal.doneSeason")}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <button className="btn btn-soft btn-sm" onClick={() => onOpenSite(keeper.adopted!)}>{t("journal.open")} →</button>
              <button
                className="btn btn-soft btn-sm"
                title={t("journal.remindHint")}
                onClick={() => {
                  const code = keeper.adopted!;
                  const geo = siteGeo(code);
                  if (!geo) return;
                  downloadIcs(`streamkeepers-${code}-seasonal.ics`, reminderIcs({
                    siteCode: code, siteName: siteName(code), lat: geo.lat, lon: geo.lon, seasonal: true, now: new Date(),
                    url: missionLink(location.href, code, lang),
                    title: t("remind.title", { site: siteName(code) }),
                    description: t("remind.descSeason", { site: siteName(code) }),
                  }));
                }}
              >
                ⏰ {t("journal.remindSeason")}
              </button>
            </div>
            <p className="tiny muted" style={{ margin: "8px 0 0" }}>{t("journal.remindHint")}</p>
            <p className="small" style={{ margin: "10px 0 0" }}>
              <a href="https://www.oneaquahealth.eu/groups/" target="_blank" rel="noreferrer">{t("journal.community")} ↗</a>
            </p>
          </>
        ) : (
          <p className="small muted" style={{ margin: "4px 0 0" }}>{t("journal.adoptNone")}</p>
        )}
      </div>

      <label className="field">
        {t("journal.name")} <span className="tiny muted" style={{ fontWeight: 400 }}>{t("journal.nameHint")}</span>
        <input value={keeper.name} onChange={(e) => onName(e.target.value)} placeholder={t("journal.namePh")} maxLength={40} />
      </label>

      <p className="eyebrow" style={{ marginBottom: 6 }}>{t("journal.entries")}</p>
      {checks.length === 0 ? (
        <p className="empty">{t("journal.empty")}</p>
      ) : (
        <ul className="entries">
          {[...checks].reverse().map((c) => (
            <li key={c.id} className="entry">
              <span>
                <span className="entry-title" style={{ display: "block" }}>{siteName(c.siteCode)}</span>
                <span className="entry-sub">
                  {new Date(c.submittedAt).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })}
                  {" · "}
                  {c.sync?.ok ? t("journal.synced") : c.sync ? (
                    <button className="btn btn-quiet tiny" style={{ minHeight: 0, padding: 0, textDecoration: "underline" }} onClick={() => onRetry(c.id)}>{t("journal.notSynced")}</button>
                  ) : t("journal.local")}
                </span>
              </span>
              <span className={`pill ${c.gate.outcome === "ACCEPTED" ? "pill-ok" : "pill-hold"}`}>
                {c.gate.outcome === "ACCEPTED" ? `+${c.creditedPoints}${c.practice ? ` ${t("journal.practice")}` : ""}` : t("journal.withReviewer")}
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="eyebrow" style={{ marginBottom: 8 }}>{t("journal.settings")}</p>
      <div className="settings">
        <label className="setting">
          <span>{t("journal.practiceMode")}<small>{t("journal.practiceHint")}</small></span>
          <input type="checkbox" role="switch" className="switch" checked={settings.practice} onChange={(e) => onSettings({ ...settings, practice: e.target.checked })} />
        </label>
        <label className="setting">
          <span>{t("journal.sim")}<small>{t("journal.simHint")}</small></span>
          <input type="checkbox" role="switch" className="switch" checked={settings.simulated} onChange={(e) => onSettings({ ...settings, simulated: e.target.checked })} />
        </label>
        <label className="field" style={{ margin: 0 }}>
          {t("journal.server")}
          <select value={settings.server} onChange={(e) => onSettings({ ...settings, server: e.target.value as ServerKey })}>
            {(Object.keys(FHIR_SERVERS) as ServerKey[]).map((k) => <option key={k} value={k}>{FHIR_SERVERS[k].label}</option>)}
          </select>
        </label>
      </div>
      <button className="btn btn-danger" onClick={() => { if (confirm(t("journal.deleteConfirm"))) onReset(); }}>{t("journal.delete")}</button>
    </section>
  );
}
