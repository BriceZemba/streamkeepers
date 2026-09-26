import { useEffect } from "react";
import type { StoredCheck } from "../domain/store";
import { FHIR_SERVERS } from "../fhir/client";
import { useI18n } from "../i18n";

export function ResultView({ check, siteName, syncing, online, streak, onRetry, onDone }: {
  check: StoredCheck;
  siteName: string;
  syncing: boolean;
  online: boolean;
  /** Season streak at the adopted stream, when this check was made there. */
  streak: number | null;
  onRetry: () => void;
  onDone: () => void;
}) {
  const { t, tm } = useI18n();
  const accepted = check.gate.outcome === "ACCEPTED";
  const pts = accepted ? check.creditedPoints : check.missionPoints;
  // The check is sent from the bottom of a long review screen: start the result at the top,
  // so the points stamp is the first thing seen.
  useEffect(() => { window.scrollTo({ top: 0 }); }, [check.id]);
  return (
    <section className="result" aria-labelledby="res-h">
      <div className="stamp-stage" aria-hidden="true">
        {accepted && <><span className="ripple" /><span className="ripple r2" /></>}
        <div className={`stamp ${accepted ? "ok" : "hold"}`}>
          <div style={{ textAlign: "center" }}>
            <div className="stamp-num">{accepted ? `+${pts}` : pts}</div>
            <div className="stamp-cap">{accepted ? (check.practice ? t("result.practicePoints") : t("result.points")) : t("result.onHold")}</div>
          </div>
        </div>
      </div>

      <div aria-live="polite">
        {accepted ? (
          <>
            <h1 id="res-h" className="result-title">{check.gate.noNewPoints ? t("result.repeat") : t("result.kept")}</h1>
            <p className="result-sub">{t("result.keptSub", { site: siteName })}{check.practice ? ` ${t("result.practiceNote")}` : ""}</p>
            {streak !== null && streak > 0 && <p className="result-sub" style={{ marginTop: -14 }}><span className="adopted-badge">♥ {t("result.streak", { n: streak })}</span></p>}
          </>
        ) : (
          <>
            <h1 id="res-h" className="result-title">{t("result.heldTitle")}</h1>
            <p className="result-sub">{t("result.heldSub", { n: check.missionPoints })}</p>
          </>
        )}
      </div>

      <h2 style={{ fontSize: "1.15rem", marginBottom: 10 }}>{t("result.scored")}</h2>
      <ul className="rules">
        {check.gate.results.map((r) => (
          <li key={r.rule}>
            <span className={`mark ${r.passed ? "pass" : "hold"}`} aria-hidden="true">{r.passed ? "✓" : "!"}</span>
            <span>
              <strong>{t(`rule.${r.rule}`)}.</strong>{" "}
              {r.msgs?.length ? r.msgs.map((m) => tm(m, r.message)).join(" ") : r.message}
            </span>
          </li>
        ))}
      </ul>

      <SyncCard check={check} syncing={syncing} online={online} onRetry={onRetry} />

      <p className="promise">{t("result.promise")}</p>
      <button className="btn btn-primary btn-block" onClick={onDone}>{t("result.back")}</button>
    </section>
  );
}

export function SyncCard({ check, syncing, online, onRetry }: { check: StoredCheck; syncing: boolean; online: boolean; onRetry: () => void }) {
  const { t } = useI18n();
  const s = check.sync;
  if (syncing) {
    return <div className="sync"><header><span className="spinner" aria-hidden="true" />{t("sync.saving")}</header></div>;
  }
  if (!online && !s?.ok) {
    return <div className="sync"><header>{t("sync.failTitle")}</header><p className="small" style={{ margin: "6px 0 0" }}>{t("sync.queued")} {t("sync.failSafe")}</p></div>;
  }
  if (!s) return null;
  if (!s.ok) {
    return (
      <div className="sync err" role="status">
        <header>{t("sync.failTitle")}</header>
        <p className="small" style={{ margin: "6px 0 10px" }}>{s.error ?? t("sync.mismatch")} {t("sync.failSafe")}</p>
        <button className="btn btn-danger" onClick={onRetry}>{t("sync.retry")}</button>
      </div>
    );
  }
  const obs = s.refs.filter((r) => r.startsWith("Observation/")).length;
  return (
    <div className="sync ok" role="status">
      <header><span aria-hidden="true">✓</span> {t("sync.ok", { host: new URL(s.server).host })}</header>
      <p className="small" style={{ margin: "6px 0 0" }}>{obs > 0 ? t("sync.okObs", { n: obs }) : t("sync.okQr")}</p>
      {s.server === FHIR_SERVERS.hapi.base && <p className="tiny" style={{ margin: "6px 0 0" }}>{t("sync.hapi")}</p>}
      <details>
        <summary>{t("sync.see", { n: s.refs.length })}</summary>
        <ul>
          {s.verified.map((v) => (
            <li key={v.ref}><a href={`${s.server}/${v.ref}`} target="_blank" rel="noreferrer">{v.ref}</a> · {v.note}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}
