import { useMemo, useState } from "react";
import { evaluate } from "./domain/qualityGate";
import { checksThisSeason, clearChecks, loadChecks, loadKeeper, saveCheck, saveKeeper, type StoredCheck } from "./domain/store";
import { CheckFlow, type CheckDraft } from "./ui/CheckFlow";
import { KeeperView, type Settings } from "./ui/KeeperView";
import { MissionsView } from "./ui/MissionsView";
import { ResultView } from "./ui/ResultView";
import { useMissions, type Mission } from "./ui/useMissions";

type Screen = { name: "missions" } | { name: "keeper" } | { name: "check"; mission: Mission } | { name: "result"; check: StoredCheck; siteName: string };

const SETTINGS_KEY = "sk.settings.v1";

function initialSettings(): Settings {
  const fromUrl = new URLSearchParams(location.search).has("practice");
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "null") as Settings | null;
    if (saved) return { ...saved, practice: saved.practice || fromUrl };
  } catch { /* ignore */ }
  return { practice: fromUrl, simulated: true };
}

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: "missions" });
  const [checks, setChecks] = useState<StoredCheck[]>(loadChecks);
  const [keeper, setKeeper] = useState(loadKeeper);
  const [settings, setSettingsState] = useState<Settings>(initialSettings);
  const [now, setNow] = useState(() => new Date());

  const counts = useMemo(() => checksThisSeason(checks, now, settings.simulated), [checks, now, settings.simulated]);
  const missions = useMissions(counts, now);
  const siteName = (code: string) => missions.find((m) => m.site.code === code)?.site.name ?? code;

  const setSettings = (s: Settings) => {
    setSettingsState(s);
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* ignore */ }
  };

  const submit = (mission: Mission, d: CheckDraft) => {
    const sub = { siteCode: mission.site.code, keeperId: keeper.id, practice: settings.practice, ...d };
    const gate = evaluate(sub, checks);
    const credited = gate.outcome === "ACCEPTED" && !gate.noNewPoints ? mission.value.points : 0;
    const stored: StoredCheck = { ...sub, id: crypto.randomUUID(), gate, missionPoints: mission.value.points, creditedPoints: credited };
    setChecks(saveCheck(stored));
    setNow(new Date());
    setScreen({ name: "result", check: stored, siteName: mission.site.name });
  };

  const inCheck = screen.name === "check";

  return (
    <div className="app">
      {!inCheck && (
        <header className="topbar">
          <span className="brand"><span aria-hidden="true">≋</span> StreamKeepers</span>
          {settings.practice && <span className="tag review">Practice mode</span>}
        </header>
      )}
      <main id="main">
        {screen.name === "missions" && <MissionsView missions={missions} simulated={settings.simulated} onStart={(m) => setScreen({ name: "check", mission: m })} />}
        {screen.name === "check" && (
          <CheckFlow mission={screen.mission} practice={settings.practice} onCancel={() => setScreen({ name: "missions" })} onSubmit={(d) => submit(screen.mission, d)} />
        )}
        {screen.name === "result" && <ResultView check={screen.check} siteName={screen.siteName} onDone={() => setScreen({ name: "missions" })} />}
        {screen.name === "keeper" && (
          <KeeperView
            keeper={keeper}
            checks={checks}
            siteName={siteName}
            settings={settings}
            onSettings={setSettings}
            onName={(name) => { const k = { ...keeper, name }; setKeeper(k); saveKeeper(k); }}
            onReset={() => { clearChecks(); setChecks([]); }}
          />
        )}
      </main>
      {!inCheck && (
        <nav className="tabbar" aria-label="Main">
          <button aria-current={screen.name === "missions" ? "page" : undefined} onClick={() => setScreen({ name: "missions" })}>Missions</button>
          <button aria-current={screen.name === "keeper" ? "page" : undefined} onClick={() => setScreen({ name: "keeper" })}>Me</button>
        </nav>
      )}
    </div>
  );
}
