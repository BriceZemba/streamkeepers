import type { StoredCheck } from "../domain/store";
import { FHIR_SERVERS, type SyncResult } from "../fhir/client";

const RULE_NAMES: Record<string, string> = {
  complete: "Complete",
  careful: "Careful",
  at_site: "At the stream",
  consistent: "Consistent",
  not_duplicate: "New visit",
};

export function ResultView({ check, siteName, syncing, onRetry, onDone }: { check: StoredCheck; siteName: string; syncing: boolean; onRetry: () => void; onDone: () => void }) {
  const accepted = check.gate.outcome === "ACCEPTED";
  const pts = accepted ? check.creditedPoints : check.missionPoints;
  return (
    <section className="result" aria-labelledby="res-h">
      <div className="stamp-stage" aria-hidden="true">
        {accepted && <><span className="ripple" /><span className="ripple r2" /></>}
        <div className={`stamp ${accepted ? "ok" : "hold"}`}>
          <div style={{ textAlign: "center" }}>
            <div className="stamp-num">{accepted ? `+${pts}` : pts}</div>
            <div className="stamp-cap">{accepted ? (check.practice ? "practice points" : "points") : "points on hold"}</div>
          </div>
        </div>
      </div>

      <div aria-live="polite">
        {accepted ? (
          <>
            <h1 id="res-h" className="result-title">{check.gate.noNewPoints ? "Saved: repeat visit today" : "Stream kept."}</h1>
            <p className="result-sub">Your check of <b>{siteName}</b> is now part of the season's record.{check.practice ? " Practice points don't count toward team goals." : ""}</p>
          </>
        ) : (
          <>
            <h1 id="res-h" className="result-title">Saved. A reviewer will take a look.</h1>
            <p className="result-sub">Nothing is deleted. If a reviewer confirms your check, the full {check.missionPoints} points are yours.</p>
          </>
        )}
      </div>

      <h2 style={{ fontSize: "1.15rem", marginBottom: 10 }}>How your check was scored</h2>
      <ul className="rules">
        {check.gate.results.map((r) => (
          <li key={r.rule}>
            <span className={`mark ${r.passed ? "pass" : "hold"}`} aria-hidden="true">{r.passed ? "✓" : "!"}</span>
            <span><strong>{RULE_NAMES[r.rule]}.</strong> {r.message}</span>
          </li>
        ))}
      </ul>

      <SyncCard check={check} syncing={syncing} onRetry={onRetry} />

      <p className="promise">What you reported, clean or polluted, never changes your points. Only care, being at the stream and consistent answers do.</p>
      <button className="btn btn-primary btn-block" onClick={onDone}>Back to missions</button>
    </section>
  );
}

export function SyncCard({ check, syncing, onRetry }: { check: StoredCheck & { sync?: SyncResult }; syncing: boolean; onRetry: () => void }) {
  const s = check.sync;
  if (syncing) {
    return <div className="sync"><header><span className="spinner" aria-hidden="true" />Saving in OneAquaHealth FHIR format…</header></div>;
  }
  if (!s) return null;
  const host = new URL(s.server).host;
  if (!s.ok) {
    return (
      <div className="sync err" role="status">
        <header>Not saved to the FHIR server yet</header>
        <p className="small" style={{ margin: "6px 0 10px" }}>{s.error ?? "The server's copy didn't match what was sent."} Your check is safe on this phone.</p>
        <button className="btn btn-danger" onClick={onRetry}>Try again</button>
      </div>
    );
  }
  const obs = s.refs.filter((r) => r.startsWith("Observation/")).length;
  return (
    <div className="sync ok" role="status">
      <header><span aria-hidden="true">✓</span> Saved and verified on {host}</header>
      <p className="small" style={{ margin: "6px 0 0" }}>
        {obs > 0
          ? `Stored as a QuestionnaireResponse and ${obs} OneAquaHealth indicator Observations, then read back separately and matched.`
          : "Stored as a QuestionnaireResponse and read back. It becomes OneAquaHealth indicator data once a reviewer confirms it."}
      </p>
      {s.server === FHIR_SERVERS.hapi.base && (
        <p className="tiny" style={{ margin: "6px 0 0" }}>
          This is the public HAPI test server, used for practice data while the OneAquaHealth sandbox can't be reached.
        </p>
      )}
      <details>
        <summary>See the {s.refs.length} FHIR resources</summary>
        <ul>
          {s.verified.map((v) => (
            <li key={v.ref}><a href={`${s.server}/${v.ref}`} target="_blank" rel="noreferrer">{v.ref}</a> · {v.note}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}
