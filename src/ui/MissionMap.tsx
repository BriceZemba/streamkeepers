import { useEffect, useMemo } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import { divIcon, latLngBounds } from "leaflet";
import "leaflet/dist/leaflet.css";
import { band, type Mission } from "./useMissions";

function FitTo({ missions }: { missions: Mission[] }) {
  const map = useMap();
  const key = missions.map((m) => m.site.code).sort().join();
  useEffect(() => {
    if (missions.length === 0) return;
    // Wait for the container's final size, otherwise the fit uses a stale size.
    const t = setTimeout(() => {
      map.invalidateSize();
      map.fitBounds(latLngBounds(missions.map((m) => [m.site.lat, m.site.lon])), { padding: [28, 28], maxZoom: 14 });
    }, 60);
    return () => clearTimeout(t);
    // Fit only when the set of sites changes, not on every points update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);
  return null;
}

/** Leaflet only listens to window resizes; banners and the sheet change the container too. */
function KeepSized() {
  const map = useMap();
  useEffect(() => {
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(map.getContainer());
    return () => ro.disconnect();
  }, [map]);
  return null;
}

function FlyToSelected({ mission }: { mission: Mission | null }) {
  const map = useMap();
  useEffect(() => {
    if (mission) map.flyTo([mission.site.lat, mission.site.lon], Math.max(map.getZoom(), 14), { duration: 0.6 });
  }, [mission, map]);
  return null;
}

const icon = (m: Mission, selected: boolean) =>
  divIcon({
    className: "pin-host",
    html: `<div class="pin pin-${band(m.value.points)}${selected ? " is-selected" : ""}"><span>${m.value.points}</span></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });

export function MissionMap({ missions, selected, onSelect, label }: { missions: Mission[]; selected: Mission | null; onSelect: (code: string) => void; label: string }) {
  // Draw higher-value pins on top.
  const ordered = useMemo(() => [...missions].sort((a, b) => a.value.points - b.value.points), [missions]);
  return (
    <div className="map" role="region" aria-label={label}>
      <MapContainer center={[40.2, -8.42]} zoom={12} scrollWheelZoom={false} zoomControl style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        <KeepSized />
        <FitTo missions={missions} />
        <FlyToSelected mission={selected} />
        {ordered.map((m) => (
          <Marker
            key={m.site.code}
            position={[m.site.lat, m.site.lon]}
            icon={icon(m, m.site.code === selected?.site.code)}
            zIndexOffset={m.site.code === selected?.site.code ? 1000 : m.value.points}
            title={`${m.site.name}: ${m.value.points} points`}
            eventHandlers={{ click: () => onSelect(m.site.code) }}
          />
        ))}
      </MapContainer>
    </div>
  );
}
