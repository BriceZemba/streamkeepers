import { useEffect } from "react";
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from "react-leaflet";
import { latLngBounds } from "leaflet";
import "leaflet/dist/leaflet.css";
import { band, type Mission } from "./useMissions";

const COLORS = { high: "#0b6e4f", mid: "#2f8fbf", low: "#9bb7c9" };

function FitTo({ missions }: { missions: Mission[] }) {
  const map = useMap();
  useEffect(() => {
    if (missions.length === 0) return;
    const b = latLngBounds(missions.map((m) => [m.site.lat, m.site.lon]));
    map.fitBounds(b, { padding: [24, 24], maxZoom: 14 });
  }, [missions, map]);
  return null;
}

export function MissionMap({ missions, selected, onSelect }: { missions: Mission[]; selected: string | null; onSelect: (code: string) => void }) {
  return (
    <div className="map" role="region" aria-label="Map of stream missions">
      <MapContainer center={[40.2, -8.42]} zoom={12} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FitTo missions={missions} />
        {missions.map((m) => {
          const b = band(m.value.points);
          const isSel = m.site.code === selected;
          return (
            <CircleMarker
              key={m.site.code}
              center={[m.site.lat, m.site.lon]}
              radius={isSel ? 14 : 6 + m.value.points / 20}
              pathOptions={{ color: isSel ? "#10222e" : "#ffffff", weight: isSel ? 3 : 1.5, fillColor: COLORS[b], fillOpacity: 0.9 }}
              eventHandlers={{ click: () => onSelect(m.site.code) }}
            >
              <Tooltip direction="top">{`${m.site.name}: ${m.value.points} pts`}</Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
