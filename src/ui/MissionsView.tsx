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
  const needed = inArea.filter((m) => m.checksThisSeason < 3);
  const covered = inArea.filter((m) => m.checksThisSeason >= 3);
  const areaName = area === "CITIZEN" ? "citizen sites" : CITIES.find((c) => c.id === area)?.name;

  return (
    <>
      <div className="map-wrap">
        <MissionMap missions={inArea} selected={current} onSelect={setSelected} />
      </div>
      <section className="sheet" aria-label="Missions">
        {current ? (
          <MissionDetail mission={current} onStart={() => onStart(current)} onClose={() => setSelected(null)} />
        ) : (
          <>
            <div className="areas" role="tablist" aria-label="Area">
              {[...CITIES.map((c) => ({ id: c.id, name: c.name })), { id: "CITIZEN", name: "Citizen sites" }].map((c) => (
                <button key={c.id} role="tab" aria-selected={area === c.id} className="area" onClick={() => { setArea(c.id); setSelected(null); }}>
                  {c.name}
                </button>
              ))}
            </div>

            <div className="section-head">
              <div>
                <p className="eyebrow">This season · {areaName}</p>
                <h2>Where your next check matters most</h2>
              </div>
            </div>

            {simulated && covered.length > 0 && (
              <p className="sim-note" role="note">
                <span aria-hidden="true">◐</span>
                <span><b>Demo:</b> “checked this season” counts marked here are simulated community activity. Sites, lab dates, lab risk and land use are real OneAquaHealth data.</span>
              </p>
            )}

            <MissionList missions={needed.slice(0, 10)} onSelect={setSelected} ranked />

            {covered.length > 0 && (
              <>
                <div className="section-head" style={{ marginTop: 28 }}>
                  <div>
                    <p className="eyebrow">Already well covered</p>
                    <h3>Still worth a visit, but adds less</h3>
                  </div>
                </div>
                <MissionList missions={covered} onSelect={setSelected} muted />
              </>
            )}
          </>
        )}
      </section>
    </>
  );
}

function Token({ points, size }: { points: number; size?: "xl" }) {
  return (
    <span className={`token token-${band(points)}${size ? ` token-${size}` : ""}`} aria-label={`${points} points`}>
      <span>{points}<small>pts</small></span>
    </span>
  );
}

function MissionList({ missions, onSelect, ranked, muted }: { missions: Mission[]; onSelect: (code: string) => void; ranked?: boolean; muted?: boolean }) {
  return (
    <ol className={`missions${muted ? " is-muted" : ""}`}>
      {missions.map((m) => (
        <li key={m.site.code}>
          <button className="mission" onClick={() => onSelect(m.site.code)}>
            <Token points={m.value.points} />
            <span>
              <span className="mission-title">{m.site.name}</span>
              <span className="mission-sub" style={{ display: "block" }}>{headline(m)}</span>
            </span>
            {ranked ? <span className="chev" aria-hidden="true">→</span> : <span className="pill pill-sim">{m.checksThisSeason}×</span>}
          </button>
        </li>
      ))}
    </ol>
  );
}

/** One-line summary for the list. Lab staleness is similar at almost every site
 * (all public lab campaigns are 2023–24), so lead with what differs. */
function headline(m: Mission): string {
  if (m.checksThisSeason > 0) return `Checked ${m.checksThisSeason}× this season${m.site.labRiskScore !== null ? ` · lab risk ${m.site.labRiskScore.toFixed(2)}` : ""}`;
  const bits = ["No check yet this season"];
  if (m.site.labRiskScore !== null) bits.push(`lab risk ${m.site.labRiskScore.toFixed(2)}`);
  if (m.site.kind === "citizen") bits.push("no lab data");
  return bits.join(" · ");
}

function MissionDetail({ mission, onStart, onClose }: { mission: Mission; onStart: () => void; onClose: () => void }) {
  const { site, value } = mission;
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [site.code]);
  const parts = value.parts.filter((p) => p.points > 0 || p.key === "coverage");
  return (
    <article className="detail" aria-labelledby="mc-h" ref={ref}>
      <button className="back" onClick={onClose}>← All missions</button>
      <header className="detail-head">
        <div>
          <p className="eyebrow">{site.cityName ?? "Citizen site"} · {site.kind === "research" ? `OAH research site ${site.code}` : "added by a volunteer"}</p>
          <h1 id="mc-h">{site.name}</h1>
        </div>
        <Token points={value.points} size="xl" />
      </header>

      <h3 style={{ marginBottom: 10 }}>Why this check is worth {value.points} points</h3>
      <ul className="ledger">
        {parts.map((p) => (
          <li key={p.key}>
            <span className="lead">{p.reason}</span>
            <span className={`amt${p.key === "coverage" ? " down" : ""}`}>{p.key === "coverage" ? "less" : `+${p.points}`}</span>
          </li>
        ))}
        <li className="total"><span className="lead">Mission value</span><span className="amt">{value.points}</span></li>
      </ul>

      <p className="promise">Your points never depend on what you find. A clean stream and a polluted one earn exactly the same.</p>

      <button className="btn btn-primary btn-block" onClick={onStart}>Start the stream check <span aria-hidden="true">→</span></button>
      <p className="tiny muted" style={{ textAlign: "center", marginTop: 10 }}>About 3 minutes · 7 short steps · no account needed</p>
    </article>
  );
}
