import { useMemo } from "react";
import { buildSiteFacts, type SiteFacts } from "../domain/siteFacts";
import { missionValue, percentileRanks, type MissionValue } from "../domain/missionValue";

export interface Mission {
  site: SiteFacts;
  value: MissionValue;
  checksThisSeason: number;
}

const FACTS = buildSiteFacts();
const PEOPLE_PCT = percentileRanks(FACTS.map((s) => s.peopleNearby));

export function useMissions(counts: Map<string, number>, now: Date): Mission[] {
  return useMemo(
    () =>
      FACTS.map((site, i) => {
        const n = counts.get(site.code) ?? 0;
        return { site, checksThisSeason: n, value: missionValue(site, { checksThisSeason: n }, now, PEOPLE_PCT[i]) };
      }).sort((a, b) => b.value.points - a.value.points),
    [counts, now],
  );
}

export function band(points: number): "high" | "mid" | "low" {
  return points >= 90 ? "high" : points >= 50 ? "mid" : "low";
}
