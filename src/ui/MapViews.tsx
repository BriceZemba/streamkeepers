import { lazy, Suspense, useState } from "react";
import { useI18n } from "../i18n";
import { MissionMap, type FlatView } from "./MissionMap";
import type { Mission } from "./useMissions";

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

export function MapViews(props: { missions: Mission[]; selected: Mission | null; onSelect: (code: string) => void; label: string }) {
  const { t } = useI18n();
  const [view, setView] = useState<View>(initial);
  const webgl = hasWebGL();
  const choose = (v: View) => {
    setView(v);
    try { localStorage.setItem(KEY, v); } catch { /* ignore */ }
  };
  return (
    <>
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
    </>
  );
}
