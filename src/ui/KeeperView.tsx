import type { Keeper, StoredCheck } from "../domain/store";

export interface Settings {
  practice: boolean;
  simulated: boolean;
}

export function KeeperView({ keeper, checks, siteName, settings, onSettings, onName, onReset }: {
  keeper: Keeper;
  checks: StoredCheck[];
  siteName: (code: string) => string;
  settings: Settings;
  onSettings: (s: Settings) => void;
  onName: (name: string) => void;
  onReset: () => void;
}) {
  const total = checks.reduce((s, c) => s + c.creditedPoints, 0);
  const held = checks.filter((c) => c.gate.outcome === "REVIEW");
  const sites = new Set(checks.map((c) => c.siteCode)).size;
  return (
    <section aria-labelledby="keeper-h">
      <h1 id="keeper-h">Your stream keeping</h1>
      <label className="field">
        Name shown to your team (optional)
        <input value={keeper.name} onChange={(e) => onName(e.target.value)} placeholder="e.g. Ana from Eiras" maxLength={40} />
      </label>
      <div className="stats">
        <div><strong>{total}</strong><span>points</span></div>
        <div><strong>{checks.length}</strong><span>checks</span></div>
        <div><strong>{sites}</strong><span>streams</span></div>
        <div><strong>{held.length}</strong><span>in review</span></div>
      </div>

      <h2>Your checks</h2>
      {checks.length === 0 ? <p className="muted">No checks yet. Pick a mission to start.</p> : (
        <ul className="history">
          {[...checks].reverse().map((c) => (
            <li key={c.id}>
              <span>{siteName(c.siteCode)}<small>{new Date(c.submittedAt).toLocaleString()}</small></span>
              <span className={c.gate.outcome === "ACCEPTED" ? "tag ok" : "tag review"}>
                {c.gate.outcome === "ACCEPTED" ? `+${c.creditedPoints}${c.practice ? " practice" : ""}` : "in review"}
              </span>
            </li>
          ))}
        </ul>
      )}

      <h2>Settings</h2>
      <label className="toggle">
        <input type="checkbox" checked={settings.practice} onChange={(e) => onSettings({ ...settings, practice: e.target.checked })} />
        <span>Practice mode <small>Try a check anywhere; location isn't checked and points are marked as practice.</small></span>
      </label>
      <label className="toggle">
        <input type="checkbox" checked={settings.simulated} onChange={(e) => onSettings({ ...settings, simulated: e.target.checked })} />
        <span>Show simulated community activity <small>Demo only. Real OneAquaHealth data is unaffected.</small></span>
      </label>
      <button className="btn btn-danger" onClick={() => { if (confirm("Delete all checks stored on this device?")) onReset(); }}>Delete checks on this device</button>
    </section>
  );
}
