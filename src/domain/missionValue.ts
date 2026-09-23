// Mission value: how many points a stream check at a site is worth right now.
//
// Principle: points follow the scientific value of the next observation, never
// the result a volunteer reports. The weights are policy choices a coordinator
// can see and edit; they are not validated science.
import type { SiteFacts } from "./siteFacts";

export interface Weights {
  base: number;
  /** Max points for a site whose last lab campaign is >= labStaleCapMonths old. */
  labStaleness: number;
  labStaleCapMonths: number;
  /** Points for a site with no lab record at all (citizen data is the only data). */
  noLabRecord: number;
  /** Points for no citizen check yet this season. */
  seasonGap: number;
  /** Max points scaled by the OAH lab health-risk score (0..1). */
  labRisk: number;
  /** Max points scaled by how many people live near the water (percentile). */
  peopleNearby: number;
}

export const DEFAULT_WEIGHTS: Weights = {
  base: 10,
  labStaleness: 40,
  labStaleCapMonths: 36,
  noLabRecord: 25,
  seasonGap: 30,
  labRisk: 30,
  peopleNearby: 20,
};

export interface CitizenActivity {
  /** Accepted checks at this site in the current season. */
  checksThisSeason: number;
}

export interface ValuePart {
  key: "base" | "labStaleness" | "noLabRecord" | "seasonGap" | "labRisk" | "peopleNearby" | "coverage";
  points: number;
  reason: string;
}

export interface MissionValue {
  points: number;
  parts: ValuePart[];
}

export function monthsBetween(fromIso: string, to: Date): number {
  const from = new Date(fromIso + "T00:00:00Z");
  return (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth());
}

/** Percentile rank (0..1) of each value among the non-null values. */
export function percentileRanks(values: (number | null)[]): (number | null)[] {
  const known = values.filter((v): v is number => v !== null).sort((a, b) => a - b);
  if (known.length === 0) return values.map(() => null);
  return values.map((v) => {
    if (v === null) return null;
    let below = 0;
    while (below < known.length && known[below] < v) below++;
    return known.length === 1 ? 1 : below / (known.length - 1);
  });
}

const fmtMonth = (iso: string) =>
  new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });

export function missionValue(
  site: SiteFacts,
  activity: CitizenActivity,
  now: Date,
  peoplePercentile: number | null,
  w: Weights = DEFAULT_WEIGHTS,
): MissionValue {
  const need: ValuePart[] = [];

  if (site.lastLabDate) {
    const months = Math.max(0, monthsBetween(site.lastLabDate, now));
    const pts = w.labStaleness * Math.min(1, months / w.labStaleCapMonths);
    need.push({ key: "labStaleness", points: pts, reason: `Last OneAquaHealth lab visit ${fmtMonth(site.lastLabDate)} (${months} months ago)` });
  } else {
    need.push({ key: "noLabRecord", points: w.noLabRecord, reason: "No lab data on record: citizen checks are the only data here" });
  }

  if (activity.checksThisSeason === 0) {
    need.push({ key: "seasonGap", points: w.seasonGap, reason: "Nobody has checked this stream this season" });
  }

  if (site.labRiskScore !== null) {
    need.push({
      key: "labRisk",
      points: w.labRisk * site.labRiskScore,
      reason: `Lab health-risk score ${site.labRiskScore.toFixed(2)} (pathogens, faecal, resistance genes)`,
    });
  }

  if (peoplePercentile !== null && peoplePercentile > 0) {
    need.push({
      key: "peopleNearby",
      points: w.peopleNearby * peoplePercentile,
      reason:
        peoplePercentile >= 0.5
          ? `More people live near this water than at ${Math.round(peoplePercentile * 100)}% of OAH sites`
          : "Some people live near this water",
    });
  }

  // Diminishing returns: each accepted check this season halves, then thirds... the need.
  const coverage = 1 / (1 + activity.checksThisSeason);
  const needTotal = need.reduce((s, p) => s + p.points, 0);
  const parts: ValuePart[] = [{ key: "base", points: w.base, reason: "Every careful check counts" }];
  for (const p of need) parts.push({ ...p, points: p.points * coverage });
  if (activity.checksThisSeason > 0) {
    parts.push({
      key: "coverage",
      points: 0,
      reason: `Already checked ${activity.checksThisSeason}× this season, so this visit adds less (need × ${coverage.toFixed(2)})`,
    });
  }
  const points = Math.round(w.base + needTotal * coverage);
  return { points, parts: parts.map((p) => ({ ...p, points: Math.round(p.points) })) };
}

/** Meteorological season key, e.g. "2026-autumn" (Dec counts toward next year's winter). */
export function seasonKey(d: Date): string {
  const m = d.getUTCMonth();
  const y = d.getUTCFullYear();
  if (m === 11) return `${y + 1}-winter`;
  if (m <= 1) return `${y}-winter`;
  if (m <= 4) return `${y}-spring`;
  if (m <= 7) return `${y}-summer`;
  return `${y}-autumn`;
}
