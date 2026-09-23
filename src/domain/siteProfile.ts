// "What we know about this site": a short, factual description built only from
// OneAquaHealth data (lab campaign components and land use). Nothing is invented;
// a site without data says so.
import type { Msg } from "./missionValue";
import type { SiteFacts } from "./siteFacts";

export type Level = "top" | "high" | "moderate" | "low";

/** Lab scores are scaled across the OAH network, so levels are relative to the other sites. */
export function level(score: number): Level {
  return score >= 0.85 ? "top" : score >= 0.6 ? "high" : score >= 0.3 ? "moderate" : "low";
}

export interface ProfileLine extends Msg {
  /** Visual hint for the UI: a lab level, or neutral context. */
  tone?: Level;
}

export function siteProfile(site: SiteFacts): ProfileLine[] {
  const out: ProfileLine[] = [];
  if (site.status === "proposed") out.push({ key: "about.proposed", params: { day: (site.proposedAt ?? "").slice(0, 10) } });
  else if (site.status === "approved") out.push({ key: "about.approved" });
  else if (site.kind === "citizen") out.push({ key: "about.citizen" });

  if (site.lab && site.lastLabDate) {
    out.push({ key: "about.lab", params: { date: site.lastLabDate } });
    for (const [key, v] of [["about.pathogen", site.lab.pathogen], ["about.fecal", site.lab.fecal], ["about.arg", site.lab.arg]] as const) {
      out.push({ key, params: { level: `level.${level(v)}`, score: v.toFixed(2) }, tone: level(v) });
    }
    out.push({ key: "about.scaleNote" });
  } else {
    out.push({ key: "about.noLab" });
  }

  if (site.land) {
    out.push({ key: "about.land", params: { paved: Math.round(site.land.imperviousPct), green: Math.round(site.land.vegetationPct) } });
    out.push({ key: "about.distances", params: { sewage: site.land.toSewageM, hospital: site.land.toHospitalM, farm: site.land.toFarmlandM } });
  }
  return out;
}
