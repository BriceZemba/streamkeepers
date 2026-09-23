import { useEffect, useMemo, useRef, useState } from "react";
import { CITIES } from "../domain/siteFacts";
import { MissionMap } from "./MissionMap";
import { band, type Mission } from "./useMissions";

type Area = string; // city id, or "CITIZEN"

export function MissionsView({ missions, simulated, onStart }: { missions: Mission[]; simulated: boolean; onStart: (m: Mission) => void }) {
  const [area, setArea] = useState<Area>("CO");
  const [selected, setSelected] = useState<string | null>(null);

  const inArea = useMemo(
    () => missions.filter((m) => (area === "CITIZEN" ? m.site.kind === "citizen" : m.site.cityId === area)),
    [missions, area],
  );
  const current = inArea.find((m) => m.site.code === selected) ?? null;

  return (
    <section aria-labelledby="missions-h">
      <h1 id="missions-h" className="visually-hidden">Missions</h1>
      <div className="chips" role="tablist" aria-label="Area">
        {[...CITIES.map((c) => ({ id: c.id, name: c.name })), { id: "CITIZEN", name: "Citizen sites" }].map((c) => (
          <button key={c.id} role="tab" aria-selected={area === c.id} className="chip" onClick={() => { setArea(c.id); setSelected(null); }}>
            {c.name}
          </button>
        ))}
      </div>

      <MissionMap missions={inArea} selected={selected} onSelect={setSelected} />

      {simulated && (
        <p className="note" role="note">
          Demo: some “checked this season” counts are <strong>simulated</strong> community activity. Sites, lab dates, lab risk and land use are real OneAquaHealth data.
        </p>
      )}

      {current ? (
        <MissionCard mission={current} onStart={() => onStart(current)} onClose={() => setSelected(null)} />
      ) : (
        <>
          <h2 className="list-h">Most needed checks here</h2>
          <MissionList missions={inArea.filter((m) => m.checksThisSeason < 3).slice(0, 10)} onSelect={setSelected} />
          {inArea.some((m) => m.checksThisSeason >= 3) && (
            <>
              <h2 className="list-h">Already well covered this season</h2>
              <p className="muted small">Checks here still count, but add less to what scientists know.</p>
              <MissionList missions={inArea.filter((m) => m.checksThisSeason >= 3)} onSelect={setSelected} />
            </>
          )}
        </>
      )}
    </section>
  );
}

function MissionList({ missions, onSelect }: { missions: Mission[]; onSelect: (code: string) => void }) {
  return (
    <ol className="mission-list">
      {missions.map((m) => (
        <li key={m.site.code}>
          <button className="mission-row" onClick={() => onSelect(m.site.code)}>
            <span className={`pts pts-${band(m.value.points)}`}>{m.value.points}<small>pts</small></span>
            <span className="mission-name">
              {m.site.name}
              <small>{headline(m)}</small>
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}

/** One-line summary for the list. Lab staleness is similar at almost every site
 * (all public lab campaigns are 2023–24), so lead with what differs. */
function headline(m: Mission): string {
  if (m.checksThisSeason > 0) return `Checked ${m.checksThisSeason}× this season already`;
  const bits = ["Not checked this season"];
  if (m.site.labRiskScore !== null) bits.push(`lab risk ${m.site.labRiskScore.toFixed(2)}`);
  if (m.site.kind === "citizen") bits.push("no lab data");
  return bits.join(" · ");
}

function MissionCard({ mission, onStart, onClose }: { mission: Mission; onStart: () => void; onClose: () => void }) {
  const { site, value } = mission;
  const ref = useRef<HTMLElement>(null);
  useEffect(() => ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }), [site.code]);
  return (
    <article className="card" aria-labelledby="mc-h" ref={ref}>
      <header className="card-head">
        <div>
          <h2 id="mc-h">{site.name}</h2>
          <p className="muted">{site.cityName ?? "Citizen-created site"} · {site.kind === "research" ? `OneAquaHealth research site ${site.code}` : "Added by a volunteer"}</p>
        </div>
        <span className={`pts pts-big pts-${band(value.points)}`} aria-label={`${value.points} points`}>{value.points}<small>pts</small></span>
      </header>
      <h3>Why this check is worth {value.points} points</h3>
      <ul className="reasons">
        {value.parts.filter((p) => p.points > 0 || p.key === "coverage").map((p) => (
          <li key={p.key}>
            <span className="reason-pts">{p.key === "coverage" ? "↓" : `+${p.points}`}</span>
            <span>{p.reason}</span>
          </li>
        ))}
      </ul>
      <p className="muted small">Your points never depend on what you find. A clean stream and a polluted one earn the same.</p>
      <div className="actions">
        <button className="btn btn-primary" onClick={onStart}>Start stream check</button>
        <button className="btn" onClick={onClose}>Back to list</button>
      </div>
    </article>
  );
}
