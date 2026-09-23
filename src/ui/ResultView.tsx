import type { StoredCheck } from "../domain/store";

const RULE_NAMES: Record<string, string> = {
  complete: "Complete",
  careful: "Careful",
  at_site: "At the stream",
  consistent: "Consistent",
  not_duplicate: "New visit",
};

export function ResultView({ check, siteName, onDone }: { check: StoredCheck; siteName: string; onDone: () => void }) {
  const accepted = check.gate.outcome === "ACCEPTED";
  return (
    <section className="result" aria-live="polite" aria-labelledby="res-h">
      <div className={`result-banner ${accepted ? "ok" : "review"}`}>
        {accepted ? (
          <>
            <p className="result-pts">+{check.creditedPoints}<small> pts</small></p>
            <h1 id="res-h">{check.gate.noNewPoints ? "Saved: repeat visit today" : `Thank you for checking ${siteName}`}</h1>
            {check.practice && <p className="small">Practice points: they show how scoring works and don't count toward team goals.</p>}
          </>
        ) : (
          <>
            <p className="result-pts">{check.missionPoints}<small> pts on hold</small></p>
            <h1 id="res-h">Saved and sent to a reviewer</h1>
            <p className="small">Nothing is deleted. If a reviewer confirms your check, you get the full {check.missionPoints} points.</p>
          </>
        )}
      </div>

      <h2>How your check was scored</h2>
      <ul className="rules">
        {check.gate.results.map((r) => (
          <li key={r.rule} className={r.passed ? "pass" : "hold"}>
            <span aria-hidden="true">{r.passed ? "✓" : "!"}</span>
            <span><strong>{RULE_NAMES[r.rule]}</strong>: {r.message}</span>
          </li>
        ))}
      </ul>
      <p className="muted small">What you reported (clean or polluted) never changes your points. Only care, being at the stream and consistent answers do.</p>
      <div className="actions"><button className="btn btn-primary" onClick={onDone}>Back to missions</button></div>
    </section>
  );
}
