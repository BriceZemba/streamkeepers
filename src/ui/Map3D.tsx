// 3D terrain view (MapLibre GL). Loaded only when the volunteer picks "3D", so
// the main bundle stays small. Keyless sources: Esri World Imagery (also used by
// the OneAquaHealth Resilience Map) and the public AWS Terrain Tiles.
import { useEffect, useRef } from "react";
import { LngLatBounds, Map as MlMap, Marker, NavigationControl, setWorkerUrl, type StyleSpecification } from "maplibre-gl";
// MapLibre 6 finds its worker next to its own file, which bundlers move. Vite's
// ?worker&url emits a self-contained worker chunk (official MapLibre guidance).
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";

import "maplibre-gl/dist/maplibre-gl.css";
import { band, type Mission } from "./useMissions";
import type { Me } from "./MissionMap";


setWorkerUrl(workerUrl);

const STYLE: StyleSpecification = {
  version: 8,
  sources: {
    satellite: {
      type: "raster",
      tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
      tileSize: 256,
      maxzoom: 19,
      attribution: "Imagery © Esri, Maxar, Earthstar Geographics",
    },
    labels: {
      type: "raster",
      tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"],
      tileSize: 256,
      maxzoom: 19,
    },
    terrain: {
      type: "raster-dem",
      tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
      tileSize: 256,
      encoding: "terrarium",
      maxzoom: 14,
      attribution: "Terrain: Mapzen / AWS Terrain Tiles",
    },
  },
  layers: [
    { id: "satellite", type: "raster", source: "satellite" },
    { id: "labels", type: "raster", source: "labels", paint: { "raster-opacity": 0.85 } },
  ],
  terrain: { source: "terrain", exaggeration: 1.6 },
  // Light, low haze so the overview reads as landscape rather than fog.
  sky: { "sky-color": "#a9cbe0", "horizon-color": "#e9eef0", "fog-color": "#e9eef0", "fog-ground-blend": 0.9, "horizon-fog-blend": 0.3, "sky-horizon-blend": 0.6, "atmosphere-blend": 0 },
};

function pinElement(m: Mission, selected: boolean, onSelect: (code: string) => void): HTMLElement {
  const host = document.createElement("button");
  host.type = "button";
  host.className = "pin-3d";
  host.setAttribute("aria-label", `${m.site.name}: ${m.value.points}`);
  host.innerHTML = `<div class="pin pin-${band(m.value.points)}${selected ? " is-selected" : ""}"><span>${m.value.points}</span></div>`;
  host.addEventListener("click", (e) => {
    e.stopPropagation();
    onSelect(m.site.code);
  });
  return host;
}

export default function Map3D({ missions, selected, onSelect, label, me }: { missions: Mission[]; selected: Mission | null; onSelect: (code: string) => void; label: string; me: Me | null }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | null>(null);
  const markers = useRef<Marker[]>([]);
  const meMarker = useRef<Marker | null>(null);

  useEffect(() => {
    if (!el.current) return;
    const m = new MlMap({
      container: el.current,
      style: STYLE,
      center: [-8.42, 40.2],
      zoom: 12,
      pitch: 55,
      bearing: -18,
      maxPitch: 75,
      attributionControl: { compact: true },
    });
    m.addControl(new NavigationControl({ visualizePitch: true }), "top-left");
    // Keep the credits collapsed to the (i) button on phones; they stay one tap away.
    m.once("load", () => m.getContainer().querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show"));
    map.current = m;
    if (import.meta.env.DEV) (window as unknown as { __skMap3d?: MlMap }).__skMap3d = m; // debugging aid in dev only
    const ro = new ResizeObserver(() => m.resize());
    ro.observe(el.current);
    return () => {
      ro.disconnect();
      m.remove();
      map.current = null;
    };
  }, []);

  // Pins
  const codes = missions.map((m) => m.site.code).sort().join();
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    markers.current.forEach((x) => x.remove());
    const ordered = [...missions].sort((a, b) => a.value.points - b.value.points);
    markers.current = ordered.map((ms) =>
      new Marker({ element: pinElement(ms, ms.site.code === selected?.site.code, onSelect), anchor: "bottom" })
        .setLngLat([ms.site.lon, ms.site.lat])
        .addTo(m),
    );
  }, [missions, selected, onSelect]);

  // "You are here" dot
  useEffect(() => {
    const m = map.current;
    meMarker.current?.remove();
    meMarker.current = null;
    if (!m || !me) return;
    const dot = document.createElement("div");
    dot.className = "me-dot";
    meMarker.current = new Marker({ element: dot }).setLngLat([me.lon, me.lat]).addTo(m);
  }, [me]);

  // Frame the area when the set of sites changes; fly to a selected site.
  useEffect(() => {
    const m = map.current;
    if (!m || missions.length === 0 || selected) return;
    const b = new LngLatBounds();
    missions.forEach((ms) => b.extend([ms.site.lon, ms.site.lat]));
    if (me) b.extend([me.lon, me.lat]);
    // A flat fit at a steep tilt zooms far out and shows mostly sky and haze, so
    // fit flat, then tilt at a zoom that keeps the valleys readable.
    const cam = m.cameraForBounds(b, { padding: 40 });
    if (cam?.center) m.easeTo({ center: cam.center, zoom: Math.min(14, Math.max(12, cam.zoom ?? 12)), pitch: 55, bearing: -18, duration: 900 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codes, me?.lat, me?.lon]);
  useEffect(() => {
    if (selected) map.current?.flyTo({ center: [selected.site.lon, selected.site.lat], zoom: 15, pitch: 68, duration: 1200 });
  }, [selected]);

  return <div ref={el} className="map map-3d" role="region" aria-label={label} />;
}
