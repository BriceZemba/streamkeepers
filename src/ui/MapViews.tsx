import { lazy, Suspense, useEffect, useState } from "react";
import { useI18n } from "../i18n";
import { MissionMap, type FlatView, type Me } from "./MissionMap";
import { band, type Mission } from "./useMissions";

// Loaded on first use only: MapLibre is large and most visits never need 3D.
const Map3D = lazy(() => import("./Map3D"));

type View = FlatView | "3d";
const KEY = "sk.mapview.v1";

function hasWebGL(): boolean {
  try {
    return !!document.createElement("canvas").getContext("webgl2");
  } catch {
    return false;
  }
}

function initial(): View {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "plan" || v === "satellite" || (v === "3d" && hasWebGL())) return v;
  } catch { /* ignore */ }
  return "plan";
}

export interface MapViewsProps {
  missions: Mission[];
  selected: Mission | null;
  onSelect: (code: string) => void;
  label: string;
  me: Me | null;
  locating: boolean;
  onLocate: () => void;
  onAdd: () => void;
  adding: boolean;
  draft: { lat: number; lon: number } | null;
  onMapTap?: (p: { lat: number; lon: number }) => void;
}

export function MapViews({ missions, selected, onSelect, label, me, locating, onLocate, onAdd, adding, draft, onMapTap }: MapViewsProps) {
  const { t } = useI18n();
  const [view, setView] = useState<View>(initial);
  const [full, setFull] = useState(false);
  const webgl = hasWebGL();
  const choose = (v: View) => {
    setView(v);
    try { localStorage.setItem(KEY, v); } catch { /* ignore */ }
  };

  // Enlarged map: lock page scroll, close with Escape.
  useEffect(() => {
    if (!full) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setFull(false); };
    addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; removeEventListener("keydown", onKey); };
  }, [full]);

  const props = { missions, selected, onSelect, label, me, draft, onMapTap: adding ? onMapTap : undefined };
  return (
    <div className={`map-wrap${full ? " is-full" : ""}`}>
      {view === "3d" ? (
        <Suspense fallback={<div className="map map-loading">{t("map.loading3d")}</div>}>
          <Map3D {...props} />
        </Suspense>
      ) : (
        <MissionMap {...props} view={view} />
      )}

      <div className="view-switch" role="group" aria-label={t("map.view")}>
        <button aria-pressed={view === "plan"} onClick={() => choose("plan")}>{t("map.plan")}</button>
        <button aria-pressed={view === "satellite"} onClick={() => choose("satellite")}>{t("map.satellite")}</button>
        <button aria-pressed={view === "3d"} onClick={() => choose("3d")} disabled={!webgl} title={webgl ? undefined : t("map.no3d")}>3D</button>
      </div>

      <div className="map-tools">
        {!adding && (
          <button className="map-tool" onClick={onAdd} aria-label={t("add.button")} title={t("add.button")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
          </button>
        )}
        <button className="map-tool" onClick={() => setFull((f) => !f)} aria-label={full ? t("map.exitFull") : t("map.full")} title={full ? t("map.exitFull") : t("map.full")}>
          {full ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>
          )}
        </button>
        <button className={`map-tool map-tool-label${me ? " is-on" : ""}`} onClick={onLocate} disabled={locating} aria-label={t("map.locate")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="3.5" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /><circle cx="12" cy="12" r="7.5" /></svg>
          <span>{locating ? "…" : t("map.locate")}</span>
        </button>
      </div>

      {full && selected && (
        <div className="map-card" role="status">
          <span className={`token token-${band(selected.value.points)}`}><span>{selected.value.points}<small>{t("pts")}</small></span></span>
          <span className="map-card-name">{selected.site.name}<small>{selected.site.cityName ?? ""}</small></span>
          <button className="btn btn-primary btn-sm" onClick={() => setFull(false)}>{t("map.openMission")} →</button>
        </div>
      )}
    </div>
  );
}
