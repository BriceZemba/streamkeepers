import { useMemo, useState } from "react";
import { STEPS, UNSURE } from "../domain/checkForm";
import { DEFAULT_WEIGHTS, seasonOf, seasonOrdinal, type Weights } from "../domain/missionValue";
import { isPending, REJECT_REASONS, type Decision, type RejectReason } from "../domain/review";
import { CITIES, type SiteFacts } from "../domain/siteFacts";
import type { StoredCheck } from "../domain/store";
import type { ProposedSite } from "../domain/proposedSites";
import { useI18n } from "../i18n";
import { Contours } from "./glyphs";

const KEY_REVIEWER = "sk.reviewer.v1";
const readReviewer = () => { try { return localStorage.getItem(KEY_REVIEWER) ?? ""; } catch { return ""; } };

export function CoordinatorView({ checks, sites, counts, simulated, now, reviewing, onDecide, onRetryReview, onBack, onOpenSite, proposed, onDecideSite }: {
  checks: StoredCheck[];
  sites: SiteFacts[];
  /** Accepted checks per site this season (device + optional simulated activity). */
  counts: Map<string, number>;
  simulated: boolean;
  now: Date;
  reviewing: Set<string>;
  onDecide: (checkId: string, decision: Decision, reviewer: string, reason?: RejectReason) => void;
  onRetryReview: (checkId: string) => void;
  onBack: () => void;
  onOpenSite: (code: string) => void;
  proposed: ProposedSite[];
  onDecideSite: (code: string, approve: boolean, reviewer: string) => void;
}) {
  const { t, lang, q: qText, opt, num } = useI18n();
  const locale = lang === "pt" ? "pt-PT" : lang === "fr" ? "fr-FR" : "en-GB";
  const [reviewer, setReviewer] = useState(readReviewer);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [city, setCity] = useState("CO");

  const season = seasonOf(seasonOrdinal(now));
  const research = sites.filter((s) => s.kind === "research");
  const pending = checks.filter(isPending);
  const decided = checks.filter((c) => c.review).slice(-6).reverse();
  const siteName = (code: string) => sites.find((s) => s.code === code)?.name ?? code;
  const covered = research.filter((s) => (counts.get(s.code) ?? 0) > 0).length;
  const seasonChecks = [...counts.values()].reduce((a, b) => a + b, 0);

  const q3 = useMemo(() => {
    const r = research.map((s) => s.labRiskScore).filter((x): x is number => x !== null).sort((a, b) => a - b);
    return r[Math.floor(r.length * 0.75)];
  }, [research]);
  const nextToVisit = research
    .filter((s) => s.cityId === city && (counts.get(s.code) ?? 0) === 0)
    .sort((a, b) => (b.labRiskScore ?? -1) - (a.labRiskScore ?? -1))
    .slice(0, 5);

  const saveReviewer = (v: string) => {
    setReviewer(v);
    try { localStorage.setItem(KEY_REVIEWER, v); } catch { /* ignore */ }
  };
  const who = reviewer.trim() || t("coord.reviewerDefault");
  const fmtDate = (iso: string) => new Date(iso).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
  const monthYear = (iso: string) => new Date(iso + "T00:00:00Z").toLocaleDateString(locale, { month: "short", year: "numeric", timeZone: "UTC" });

  /** The answers a reviewer needs first: overall view and the pollution signs. */
  const keyAnswers = (c: StoredCheck) =>
    ["overall", "water_color", "sewage_signs", "draining_pipes", "water_flow"].map((id) => {
      const qn = STEPS.flatMap((s) => s.questions).find((x) => x.id === id)!;
      const v = c.answers[id];
      const list = Array.isArray(v) ? v : v ? [v] : [];
      const shown = list.length === 0 ? t("check.noneAnswer") : list.map((code) => code === UNSURE ? t("check.unsure") : opt(qn, qn.options.find((o) => o.code === code)!, "label")).join(", ");
      return { label: qText(qn, "term"), shown, skipped: v === undefined };
    }).filter((a) => !a.skipped);

  return (
    <section className="journal" aria-labelledby="coord-h">
      <div className="journal-hero">
        <Contours className="contours" />
        <button className="back" style={{ color: "#a9b8b0", marginBottom: 4 }} onClick={onBack}>← {t("nav.journal")}</button>
        <p className="eyebrow">{t("coord.eyebrow", { season: `${t(`season.${season.name}`)} ${season.year}` })}</p>
        <h1 id="coord-h" style={{ color: "#f5f0e6", margin: "6px 0 0" }}>{t("coord.title")}</h1>
        <div className="stats">
          <div><strong>{seasonChecks}</strong><span>{t("coord.statChecks")}</span></div>
          <div><strong>{Math.round((100 * covered) / research.length)}%</strong><span>{t("coord.statCoverage")}</span></div>
          <div><strong>{pending.length}</strong><span>{t("coord.statPending")}</span></div>
        </div>
      </div>
      <p className="sim-note" role="note"><span aria-hidden="true">ⓘ</span><span>{t("coord.source", { sim: simulated ? t("coord.sourceSim") : "" })}</span></p>

      {/* Review queue */}
      <h2 style={{ marginTop: 8 }}>{t("coord.queue")}</h2>
      <p className="small muted" style={{ margin: "4px 0 12px" }}>{t("coord.queueHint")}</p>
      <label className="field" style={{ marginBottom: 14 }}>
        {t("coord.reviewer")}
        <input value={reviewer} onChange={(e) => saveReviewer(e.target.value)} placeholder={t("coord.reviewerPh")} maxLength={60} />
      </label>

      {pending.length === 0 ? (
        <p className="empty">{t("coord.empty")}</p>
      ) : (
        <div className="review-list" style={{ marginBottom: 22 }}>
          {pending.map((c) => (
            <article key={c.id} className="review-card coord-card">
              <header>
                <div>
                  <h3 style={{ margin: 0 }}>{siteName(c.siteCode)}</h3>
                  <span className="tiny muted">{fmtDate(c.submittedAt)} · {c.missionPoints} {t("pts")}{c.practice ? ` · ${t("journal.practice")}` : ""}</span>
                </div>
                <button className="btn btn-quiet btn-sm" onClick={() => onOpenSite(c.siteCode)}>↗</button>
              </header>
              <p className="eyebrow" style={{ margin: "8px 0 4px" }}>{t("coord.held")}</p>
              <ul className="held-reasons">
                {c.gate.results.filter((r) => !r.passed).map((r) => (
                  <li key={r.rule}><strong>{t(`rule.${r.rule}`)}.</strong> {r.msgs?.length ? r.msgs.map((m) => t(m.key, m.params, r.message)).join(" ") : r.message}</li>
                ))}
              </ul>
              <p className="eyebrow" style={{ margin: "8px 0 4px" }}>{t("coord.answers")}</p>
              <dl style={{ margin: 0 }}>
                {keyAnswers(c).map((a) => <div key={a.label} className="review-row"><dt>{a.label}</dt><dd>{a.shown}</dd></div>)}
              </dl>
              {rejecting === c.id ? (
                <div style={{ marginTop: 12 }}>
                  <p className="small" style={{ margin: "0 0 6px", fontWeight: 650 }}>{t("coord.chooseReason")}</p>
                  <div className="chips">
                    {REJECT_REASONS.map((r) => (
                      <button key={r} className="chip" onClick={() => { onDecide(c.id, "rejected", who, r); setRejecting(null); }}>{t(`coord.reason.${r}`)}</button>
                    ))}
                    <button className="chip" onClick={() => setRejecting(null)}>✕</button>
                  </div>
                </div>
              ) : (
                <div className="actions" style={{ marginTop: 12 }}>
                  <button className="btn btn-primary btn-sm" onClick={() => onDecide(c.id, "accepted", who)}>✓ {t("coord.accept")}</button>
                  <button className="btn btn-sm" onClick={() => setRejecting(c.id)}>{t("coord.reject")}</button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {decided.length > 0 && (
        <>
          <p className="eyebrow" style={{ marginBottom: 6 }}>{t("coord.decided")}</p>
          <ul className="entries">
            {decided.map((c) => (
              <li key={c.id} className="entry">
                <span>
                  <span className="entry-title" style={{ display: "block" }}>{siteName(c.siteCode)}</span>
                  <span className="entry-sub">
                    {c.review!.decision === "accepted"
                      ? t("coord.acceptedBy", { name: c.review!.reviewer })
                      : t("coord.rejectedBy", { name: c.review!.reviewer, reason: t(`coord.reason.${c.review!.reason}`) })}
                    {" · "}
                    {reviewing.has(c.id) ? t("coord.fhirWait") : c.reviewSync?.ok ? t("coord.fhirOk", { n: c.reviewSync.refs.length }) : (
                      <button className="btn btn-quiet tiny" style={{ minHeight: 0, padding: 0, textDecoration: "underline" }} onClick={() => onRetryReview(c.id)}>{t("coord.fhirFail")}</button>
                    )}
                  </span>
                </span>
                <span className={`pill ${c.review!.decision === "accepted" ? "pill-ok" : "pill-hold"}`}>{c.review!.decision === "accepted" ? `+${c.creditedPoints}` : "✕"}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Proposed streams */}
      <h2 style={{ marginTop: 18 }}>{t("coord.sites")}</h2>
      <p className="small muted" style={{ margin: "4px 0 10px" }}>{t("coord.sitesHint")}</p>
      {proposed.length === 0 ? <p className="empty">{t("coord.sitesEmpty")}</p> : (
        <ul className="entries">
          {[...proposed].reverse().map((p) => (
            <li key={p.code} className="entry">
              <span>
                <span className="entry-title" style={{ display: "block" }}>{p.name}</span>
                <span className="entry-sub">
                  {p.lat.toFixed(4)}, {p.lon.toFixed(4)} · {fmtDate(p.createdAt)}
                  {p.status === "approved" && ` · ${t("coord.siteApproved", { name: p.reviewer ?? "" })}${p.sync?.ok ? ` · ${t("coord.fhirOk", { n: p.sync.refs.length })}` : ""}`}
                  {p.status === "rejected" && ` · ${t("coord.siteRejected", { name: p.reviewer ?? "" })}`}
                </span>
              </span>
              {p.status === "proposed" ? (
                <span style={{ display: "flex", gap: 6 }}>
                  <button className="btn btn-primary btn-sm" onClick={() => onDecideSite(p.code, true, who)}>✓ {t("coord.approve")}</button>
                  <button className="btn btn-sm" onClick={() => onDecideSite(p.code, false, who)} aria-label={t("coord.reject")}>✕</button>
                </span>
              ) : (
                <span className={`pill ${p.status === "approved" ? "pill-ok" : "pill-hold"}`}>{p.status === "approved" ? "✓" : "✕"}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Coverage */}
      <h2 style={{ marginTop: 18 }}>{t("coord.coverage")}</h2>
      <div className="coverage">
        {CITIES.map((c) => {
          const cs = research.filter((s) => s.cityId === c.id);
          const done = cs.filter((s) => (counts.get(s.code) ?? 0) > 0).length;
          const highLeft = cs.filter((s) => s.labRiskScore !== null && s.labRiskScore >= q3 && (counts.get(s.code) ?? 0) === 0).length;
          return (
            <button key={c.id} className={`cov-row${city === c.id ? " is-on" : ""}`} onClick={() => setCity(c.id)} aria-pressed={city === c.id}>
              <span className="cov-name">{c.name}</span>
              <span className="cov-bar" aria-hidden="true"><span style={{ width: `${(100 * done) / cs.length}%` }} /></span>
              <span className="cov-num">{t("coord.coverageRow", { c: done, n: cs.length })}{highLeft > 0 && <small>{t("coord.highRiskLeft", { n: highLeft })}</small>}</span>
            </button>
          );
        })}
      </div>

      {/* Next to visit */}
      <h2 style={{ marginTop: 22 }}>{t("coord.next")} · {CITIES.find((c) => c.id === city)?.name}</h2>
      <p className="small muted" style={{ margin: "4px 0 10px" }}>{t("coord.nextHint")}</p>
      {nextToVisit.length === 0 ? <p className="empty">✓</p> : (
        <ol className="missions">
          {nextToVisit.map((s) => (
            <li key={s.code}>
              <button className="mission" onClick={() => onOpenSite(s.code)}>
                <span className={`token ${s.labRiskScore !== null && s.labRiskScore >= q3 ? "token-high" : "token-low"}`} aria-label={t("missions.labRisk", { score: s.labRiskScore?.toFixed(2) ?? "–" })}>
                  <span>{s.labRiskScore !== null ? num(s.labRiskScore, 2) : "–"}<small>{t("coord.riskShort")}</small></span>
                </span>
                <span>
                  <span className="mission-title">{s.name}</span>
                  <span className="mission-sub" style={{ display: "block" }}>{s.code}{s.lastLabDate ? ` · ${t("coord.lastLab", { date: monthYear(s.lastLabDate) })}` : ""}</span>
                </span>
                <span className="chev" aria-hidden="true">→</span>
              </button>
            </li>
          ))}
        </ol>
      )}

      {/* Weights */}
      <h2 style={{ marginTop: 22 }}>{t("coord.weights")}</h2>
      <p className="small muted" style={{ margin: "4px 0 10px" }}>{t("coord.weightsHint")}</p>
      <ul className="ledger">
        {(["base", "labStaleness", "noLabRecord", "seasonGap", "labRisk", "peopleNearby", "adopted"] as (keyof Weights)[]).map((k) => (
          <li key={k}><span className="lead">{t(`coord.w.${k}`)}</span><span className="amt">{DEFAULT_WEIGHTS[k]}</span></li>
        ))}
        <li><span className="lead">{t("coord.w.decay")}</span><span className="amt down">÷ (1 + n)</span></li>
      </ul>
    </section>
  );
}
