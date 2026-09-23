import type { Keeper, StoredCheck } from "../domain/store";
import { FHIR_SERVERS, type ServerKey } from "../fhir/client";
import { Contours } from "./glyphs";

export interface Settings {
  practice: boolean;
  simulated: boolean;
  server: ServerKey;
}

export function KeeperView({ keeper, checks, siteName, settings, onSettings, onName, onReset, onRetry }: {
  keeper: Keeper;
  checks: StoredCheck[];
  siteName: (code: string) => string;
  settings: Settings;
  onSettings: (s: Settings) => void;
  onName: (name: string) => void;
  onReset: () => void;
  onRetry: (id: string) => void;
}) {
  const total = checks.reduce((s, c) => s + c.creditedPoints, 0);
  const held = checks.filter((c) => c.gate.outcome === "REVIEW").length;
  const streams = new Set(checks.map((c) => c.siteCode)).size;
  return (
    <section className="journal" aria-labelledby="keeper-h">
      <div className="journal-hero">
        <Contours className="contours" />
        <p className="eyebrow">{keeper.name ? `${keeper.name}'s field journal` : "Your field journal"}</p>
        <div className="big-num" aria-label={`${total} points`}>{total}</div>
        <h1 id="keeper-h" style={{ fontSize: "1.1rem", fontWeight: 500, color: "#d8e0db" }}>points for streams that needed you</h1>
        <div className="stats">
          <div><strong>{checks.length}</strong><span>checks</span></div>
          <div><strong>{streams}</strong><span>streams</span></div>
          <div><strong>{held}</strong><span>with a reviewer</span></div>
        </div>
      </div>

      <label className="field">
        Name shown to your team <span className="tiny muted" style={{ fontWeight: 400 }}>Optional. Never sent to the FHIR server.</span>
        <input value={keeper.name} onChange={(e) => onName(e.target.value)} placeholder="e.g. Ana from Eiras" maxLength={40} />
      </label>

      <p className="eyebrow" style={{ marginBottom: 6 }}>Entries</p>
      {checks.length === 0 ? (
        <p className="empty">No checks yet. Your first stream is waiting on the map.</p>
      ) : (
        <ul className="entries">
          {[...checks].reverse().map((c) => (
            <li key={c.id} className="entry">
              <span>
                <span className="entry-title" style={{ display: "block" }}>{siteName(c.siteCode)}</span>
                <span className="entry-sub">
                  {new Date(c.submittedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                  {" · "}
                  {c.sync?.ok ? "saved to FHIR ✓" : c.sync ? <button className="btn btn-quiet tiny" style={{ minHeight: 0, padding: 0, textDecoration: "underline" }} onClick={() => onRetry(c.id)}>not synced, retry</button> : "on this phone"}
                </span>
              </span>
              <span className={`pill ${c.gate.outcome === "ACCEPTED" ? "pill-ok" : "pill-hold"}`}>
                {c.gate.outcome === "ACCEPTED" ? `+${c.creditedPoints}${c.practice ? " practice" : ""}` : "with reviewer"}
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="eyebrow" style={{ marginBottom: 8 }}>Settings</p>
      <div className="settings">
        <label className="setting">
          <span>Practice mode<small>Try a check anywhere. Location isn't checked; data is labelled as test data.</small></span>
          <input type="checkbox" role="switch" className="switch" checked={settings.practice} onChange={(e) => onSettings({ ...settings, practice: e.target.checked })} />
        </label>
        <label className="setting">
          <span>Show simulated community activity<small>Demo only. Real OneAquaHealth data is never changed.</small></span>
          <input type="checkbox" role="switch" className="switch" checked={settings.simulated} onChange={(e) => onSettings({ ...settings, simulated: e.target.checked })} />
        </label>
        <label className="field" style={{ margin: 0 }}>
          FHIR server
          <select value={settings.server} onChange={(e) => onSettings({ ...settings, server: e.target.value as ServerKey })}>
            {(Object.keys(FHIR_SERVERS) as ServerKey[]).map((k) => <option key={k} value={k}>{FHIR_SERVERS[k].label}</option>)}
          </select>
        </label>
      </div>
      <button className="btn btn-danger" onClick={() => { if (confirm("Delete all checks stored on this phone? Copies already on the FHIR server stay there.")) onReset(); }}>
        Delete checks on this phone
      </button>
    </section>
  );
}
