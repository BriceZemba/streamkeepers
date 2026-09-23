import { describe, expect, it } from "vitest";
import { buildSiteFacts } from "../domain/siteFacts";
import { missionValue, percentileRanks } from "../domain/missionValue";
import { DEFAULT_PARAMS, metrics, prepareSites, rng, simulateSeason } from "./model";

const research = buildSiteFacts().filter((s) => s.kind === "research");
const START = new Date("2026-09-01T00:00:00Z");
const sites = prepareSites(research, START);

describe("simulation", () => {
  it("scores missions with the app's own missionValue", () => {
    const pct = percentileRanks(research.map((s) => s.peopleNearby));
    const i = research.findIndex((s) => s.code === "C5");
    expect(sites[i].points.value[0]).toBe(missionValue(research[i], { checksThisSeason: 0 }, START, pct[i]).points);
    expect(sites[i].points.value[3]).toBe(missionValue(research[i], { checksThisSeason: 3 }, START, pct[i]).points);
  });

  it("strips every OAH signal in the ablation, so all sites start equal", () => {
    expect(new Set(sites.map((s) => s.points.valueNoOah[0])).size).toBe(1);
    expect(new Set(sites.map((s) => s.points.flat[5])).size).toBe(1);
  });

  it("is reproducible from its seed", () => {
    const a = simulateSeason(sites, "value", { ...DEFAULT_PARAMS, seed: 7 });
    const b = simulateSeason(sites, "value", { ...DEFAULT_PARAMS, seed: 7 });
    expect(a).toEqual(b);
    expect(rng(1)()).not.toBe(rng(2)());
  });

  it("makes no difference when volunteers ignore points (sanity check)", () => {
    const p = { ...DEFAULT_PARAMS, betaPoints: 0, seed: 11 };
    expect(simulateSeason(sites, "flat", p).checks).toEqual(simulateSeason(sites, "value", p).checks);
  });

  it("computes metrics on a hand-made season", () => {
    const res = { checks: sites.map((_, i) => (i === 0 ? 5 : 0)), travelKm: [1, 2, 3] };
    const m = metrics(sites, res);
    expect(m.totalChecks).toBe(5);
    expect(m.coverage).toBeCloseTo(1 / sites.length);
    expect(m.top10Share).toBe(1);
    // All 5 checks at the riskiest site -> share 1; all at the least risky -> share 0.
    const byRisk = sites.map((s, i) => ({ r: s.site.labRiskScore, i })).filter((x) => x.r !== null).sort((a, b) => a.r! - b.r!);
    const at = (idx: number) => metrics(sites, { checks: sites.map((_, i) => (i === idx ? 5 : 0)), travelKm: [1] }).highRiskShare;
    expect(at(byRisk[byRisk.length - 1].i)).toBe(1);
    expect(at(byRisk[0].i)).toBe(0);
    expect(m.medianTravelKm).toBe(2);
  });
});
