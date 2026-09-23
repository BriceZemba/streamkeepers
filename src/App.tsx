import { useEffect, useMemo, useRef, useState } from "react";
import { STEPS } from "./domain/checkForm";
import { evaluate } from "./domain/qualityGate";
import { buildSiteFacts } from "./domain/siteFacts";
import {
  adoptionStreak, checksThisSeason, clearChecks, clearDraft, loadChecks, loadDraft, loadKeeper,
  saveCheck, saveKeeper, updateCheck, type Draft, type StoredCheck,
} from "./domain/store";
import { FHIR_SERVERS, syncCheck, type SyncResult } from "./fhir/client";
import { checkBundle } from "./fhir/mapping";
import { LANGS, useI18n } from "./i18n";
import { CheckFlow, type CheckDraft } from "./ui/CheckFlow";
import { Mark } from "./ui/glyphs";
import { KeeperView, type Settings } from "./ui/KeeperView";
import { MissionsView } from "./ui/MissionsView";
import { ResultView } from "./ui/ResultView";
import { useOnline, useTheme } from "./ui/theme";
import { useMissions, type Mission } from "./ui/useMissions";

type Screen =
  | { name: "missions"; focus?: string }
  | { name: "keeper" }
  | { name: "check"; mission: Mission; resume?: Draft | null }
  | { name: "result"; checkId: string; siteName: string };

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
  const { t, lang, nextLang } = useI18n();
  const [theme, toggleTheme] = useTheme();
  const online = useOnline();
  // A shared or reminder link (?site=C5) opens that stream's mission directly.
  const [screen, setScreen] = useState<Screen>(() => {
    const site = new URLSearchParams(location.search).get("site");
    return site && SITES.has(site) ? { name: "missions", focus: site } : { name: "missions" };
  });
  const [checks, setChecks] = useState<StoredCheck[]>(loadChecks);
  const [keeper, setKeeper] = useState(loadKeeper);
  const [settings, setSettingsState] = useState<Settings>(initialSettings);
  const [now, setNow] = useState(() => new Date());
  const [draft, setDraft] = useState<Draft | null>(() => loadDraft());
  const [syncing, setSyncing] = useState<Set<string>>(new Set());
  const syncingRef = useRef(syncing);
  syncingRef.current = syncing;

  const streak = useMemo(() => adoptionStreak(checks, keeper.adopted, now), [checks, keeper.adopted, now]);
  const counts = useMemo(() => checksThisSeason(checks, now, settings.simulated), [checks, now, settings.simulated]);
  const missions = useMissions(counts, now, streak.dueThisSeason ? keeper.adopted ?? null : null);
  const siteName = (code: string) => SITES.get(code)?.name ?? code;

  const setSettings = (s: Settings) => {
    setSettingsState(s);
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* ignore */ }
  };
  const updateKeeper = (k: typeof keeper) => { setKeeper(k); saveKeeper(k); };

  /** Store on the chosen FHIR server. Practice checks (labelled test data) may fall
   * back to the public test server; real checks stay queued on the phone instead. */
  async function sync(check: StoredCheck) {
    const site = SITES.get(check.siteCode);
    if (!site || syncingRef.current.has(check.id)) return;
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

  // Send anything still waiting whenever the connection comes back (and on start).
  useEffect(() => {
    if (!online) return;
    for (const c of loadChecks()) if (!c.sync?.ok) void sync(c);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  const submit = (mission: Mission, d: CheckDraft) => {
    const sub = { siteCode: mission.site.code, keeperId: keeper.id, practice: settings.practice, ...d };
    const gate = evaluate(sub, checks);
    const credited = gate.outcome === "ACCEPTED" && !gate.noNewPoints ? mission.value.points : 0;
    const stored: StoredCheck = { ...sub, id: crypto.randomUUID(), gate, missionPoints: mission.value.points, creditedPoints: credited };
    setChecks(saveCheck(stored));
    clearDraft();
    setDraft(null);
    setNow(new Date());
    setScreen({ name: "result", checkId: stored.id, siteName: mission.site.name });
    if (navigator.onLine) void sync(stored);
  };

  const retry = (id: string) => {
    const c = checks.find((x) => x.id === id);
    if (c) void sync(c);
  };

  const start = (m: Mission) => {
    const d = loadDraft();
    setScreen({ name: "check", mission: m, resume: d?.siteCode === m.site.code ? d : null });
  };

  const inCheck = screen.name === "check";
  const resultCheck = screen.name === "result" ? checks.find((c) => c.id === screen.checkId) : undefined;
  const langIdx = LANGS.findIndex((l) => l.code === lang);
  const nextL = LANGS[(langIdx + 1) % LANGS.length];

  return (
    <div className="app">
      <a href="#main" className="visually-hidden">{t("app.skip")}</a>
      {!inCheck && (
        <header className="topbar">
          <span className="brand"><Mark /><span className="brand-name">StreamKeepers</span></span>
          <span className="top-actions">
            <button className="icon-btn" onClick={nextLang} aria-label={t("lang.switch", { current: LANGS[langIdx].name, next: nextL.name })} title={t("lang.switch", { current: LANGS[langIdx].name, next: nextL.name })}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" /></svg>
              {LANGS[langIdx].short}
              <span className="lang-dots" aria-hidden="true">{LANGS.map((l) => <i key={l.code} className={l.code === lang ? "on" : ""} />)}</span>
            </button>
            <button className="icon-btn" onClick={toggleTheme} aria-label={theme === "dark" ? t("theme.toLight") : t("theme.toDark")} title={theme === "dark" ? t("theme.toLight") : t("theme.toDark")}>
              {theme === "dark" ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.5" /><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" /></svg>
              )}
            </button>
          </span>
        </header>
      )}
      {!online && <div className="banner banner-offline" role="status">⚡ {t("app.offline")}</div>}
      {settings.practice && !inCheck && <div className="banner banner-practice">◎ {t("app.practiceBanner")}</div>}

      <main id="main">
        {screen.name === "missions" && (
          <MissionsView
            key={screen.focus ?? "all"}
            missions={missions}
            simulated={settings.simulated}
            adopted={keeper.adopted ?? null}
            draft={draft}
            draftTotalSteps={STEPS.length}
            focusCode={screen.focus}
            onStart={start}
            onAdopt={(code) => updateKeeper({ ...keeper, adopted: code })}
            onResume={() => {
              const m = missions.find((x) => x.site.code === draft?.siteCode);
              if (m) setScreen({ name: "check", mission: m, resume: draft });
            }}
            onDiscard={() => { clearDraft(); setDraft(null); }}
          />
        )}
        {screen.name === "check" && (
          <CheckFlow
            mission={screen.mission}
            practice={settings.practice}
            resume={screen.resume}
            onCancel={() => { setDraft(loadDraft()); setScreen({ name: "missions" }); }}
            onSubmit={(d) => submit(screen.mission, d)}
          />
        )}
        {screen.name === "result" && resultCheck && (
          <ResultView
            check={resultCheck}
            siteName={screen.siteName}
            syncing={syncing.has(resultCheck.id)}
            online={online}
            streak={resultCheck.siteCode === keeper.adopted ? streak.count : null}
            onRetry={() => retry(resultCheck.id)}
            onDone={() => setScreen({ name: "missions" })}
          />
        )}
        {screen.name === "keeper" && (
          <KeeperView
            keeper={keeper}
            checks={checks}
            siteName={siteName}
            siteGeo={(code) => SITES.get(code)}
            streak={streak}
            settings={settings}
            onSettings={setSettings}
            onName={(name) => updateKeeper({ ...keeper, name })}
            onReset={() => { clearChecks(); setChecks([]); }}
            onRetry={retry}
            onOpenSite={(code) => setScreen({ name: "missions", focus: code })}
          />
        )}
      </main>

      {!inCheck && (
        <nav className="tabbar" aria-label="Main">
          <button aria-current={screen.name !== "keeper" ? "page" : undefined} onClick={() => setScreen({ name: "missions" })}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg>
            {t("nav.missions")}
          </button>
          <button aria-current={screen.name === "keeper" ? "page" : undefined} onClick={() => setScreen({ name: "keeper" })}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" /><path d="M9 8h6M9 12h6" /></svg>
            {t("nav.journal")}
          </button>
        </nav>
      )}
    </div>
  );
}
