import { useMemo, useState } from "react";
import { evaluate } from "./domain/qualityGate";
import { buildSiteFacts } from "./domain/siteFacts";
import { checksThisSeason, clearChecks, loadChecks, loadKeeper, saveCheck, saveKeeper, updateCheck, type StoredCheck } from "./domain/store";
import { FHIR_SERVERS, syncCheck, type SyncResult } from "./fhir/client";
import { checkBundle } from "./fhir/mapping";
import { CheckFlow, type CheckDraft } from "./ui/CheckFlow";
import { Mark } from "./ui/glyphs";
import { KeeperView, type Settings } from "./ui/KeeperView";
import { MissionsView } from "./ui/MissionsView";
import { ResultView } from "./ui/ResultView";
import { useMissions, type Mission } from "./ui/useMissions";

type Screen = { name: "missions" } | { name: "keeper" } | { name: "check"; mission: Mission } | { name: "result"; checkId: string; siteName: string };

const SETTINGS_KEY = "sk.settings.v2";
const SITES = new Map(buildSiteFacts().map((s) => [s.code, s]));

function initialSettings(): Settings {
  const fromUrl = new URLSearchParams(location.search).has("practice");
  const defaults: Settings = { practice: fromUrl, simulated: true, server: "oah" };
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "null") as Settings | null;
    if (saved) return { ...defaults, ...saved, practice: saved.practice || fromUrl };
  } catch { /* ignore */ }
  return defaults;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: "missions" });
  const [checks, setChecks] = useState<StoredCheck[]>(loadChecks);
  const [keeper, setKeeper] = useState(loadKeeper);
  const [settings, setSettingsState] = useState<Settings>(initialSettings);
  const [now, setNow] = useState(() => new Date());
  const [syncing, setSyncing] = useState<Set<string>>(new Set());

  const counts = useMemo(() => checksThisSeason(checks, now, settings.simulated), [checks, now, settings.simulated]);
  const missions = useMissions(counts, now);
  const siteName = (code: string) => SITES.get(code)?.name ?? code;

  const setSettings = (s: Settings) => {
    setSettingsState(s);
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* ignore */ }
  };

  /** Store on the chosen FHIR server. Practice checks (labelled test data) may fall
   * back to the public test server; real checks stay queued on the phone instead. */
  async function sync(check: StoredCheck) {
    const site = SITES.get(check.siteCode);
    if (!site) return;
    setSyncing((s) => new Set(s).add(check.id));
    const bundle = checkBundle(check, site);
    let result: SyncResult = await syncCheck(FHIR_SERVERS[settings.server].base, bundle);
    if (!result.ok && result.refs.length === 0 && check.practice && settings.server !== "hapi") {
      const fallback = await syncCheck(FHIR_SERVERS.hapi.base, bundle);
      if (fallback.ok) result = fallback;
    }
    setChecks(updateCheck(check.id, { sync: result }));
    setSyncing((s) => { const n = new Set(s); n.delete(check.id); return n; });
  }

  const submit = (mission: Mission, d: CheckDraft) => {
    const sub = { siteCode: mission.site.code, keeperId: keeper.id, practice: settings.practice, ...d };
    const gate = evaluate(sub, checks);
    const credited = gate.outcome === "ACCEPTED" && !gate.noNewPoints ? mission.value.points : 0;
    const stored: StoredCheck = { ...sub, id: crypto.randomUUID(), gate, missionPoints: mission.value.points, creditedPoints: credited };
    setChecks(saveCheck(stored));
    setNow(new Date());
    setScreen({ name: "result", checkId: stored.id, siteName: mission.site.name });
    void sync(stored);
  };

  const retry = (id: string) => {
    const c = checks.find((x) => x.id === id);
    if (c) void sync(c);
  };

  const inCheck = screen.name === "check";
  const resultCheck = screen.name === "result" ? checks.find((c) => c.id === screen.checkId) : undefined;

  return (
    <div className="app">
      {!inCheck && (
        <header className="topbar">
          <span className="brand"><Mark /><span className="brand-name">StreamKeepers</span></span>
          {settings.practice && <span className="pill pill-practice">Practice mode</span>}
        </header>
      )}
      <main id="main">
        {screen.name === "missions" && <MissionsView missions={missions} simulated={settings.simulated} onStart={(m) => setScreen({ name: "check", mission: m })} />}
        {screen.name === "check" && (
          <CheckFlow mission={screen.mission} practice={settings.practice} onCancel={() => setScreen({ name: "missions" })} onSubmit={(d) => submit(screen.mission, d)} />
        )}
        {screen.name === "result" && resultCheck && (
          <ResultView check={resultCheck} siteName={screen.siteName} syncing={syncing.has(resultCheck.id)} onRetry={() => retry(resultCheck.id)} onDone={() => setScreen({ name: "missions" })} />
        )}
        {screen.name === "keeper" && (
          <KeeperView
            keeper={keeper}
            checks={checks}
            siteName={siteName}
            settings={settings}
            onSettings={setSettings}
            onName={(name) => { const k = { ...keeper, name }; setKeeper(k); saveKeeper(k); }}
            onReset={() => { clearChecks(); setChecks([]); }}
            onRetry={retry}
          />
        )}
      </main>
      {!inCheck && (
        <nav className="tabbar" aria-label="Main">
          <button aria-current={screen.name === "missions" || screen.name === "result" ? "page" : undefined} onClick={() => setScreen({ name: "missions" })}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg>
            Missions
          </button>
          <button aria-current={screen.name === "keeper" ? "page" : undefined} onClick={() => setScreen({ name: "keeper" })}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" /><path d="M9 8h6M9 12h6" /></svg>
            Journal
          </button>
        </nav>
      )}
    </div>
  );
}
