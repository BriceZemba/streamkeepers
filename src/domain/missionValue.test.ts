import { describe, expect, it } from "vitest";
import { buildSiteFacts } from "./siteFacts";
import { missionValue, monthsBetween, percentileRanks, seasonKey } from "./missionValue";
import type { SiteFacts } from "./siteFacts";

const NOW = new Date("2026-09-23T12:00:00Z");

const site = (over: Partial<SiteFacts> = {}): SiteFacts => ({
  code: "X1", name: "Test", cityId: "CO", cityName: "Coimbra", lat: 40, lon: -8, kind: "research",
  lastLabDate: "2023-06-28", labRiskScore: 0.5, peopleNearby: 10, ...over,
});

describe("snapshot join", () => {
  const facts = buildSiteFacts();
  it("covers every research and citizen site", () => {
    expect(facts.filter((f) => f.kind === "research")).toHaveLength(106);
    expect(facts.filter((f) => f.kind === "citizen")).toHaveLength(69);
  });
  it("attaches the latest lab campaign to research sites that have one", () => {
    const withLab = facts.filter((f) => f.lastLabDate);
    expect(withLab.length).toBeGreaterThan(80);
    expect(withLab.every((f) => f.labRiskScore! >= 0 && f.labRiskScore! <= 1)).toBe(true);
  });
});

describe("missionValue", () => {
  it("is worth more at an unchecked, stale site than at a crowded one", () => {
    const quiet = missionValue(site(), { checksThisSeason: 0 }, NOW, 0.5);
    const crowded = missionValue(site(), { checksThisSeason: 9 }, NOW, 0.5);
    expect(quiet.points).toBeGreaterThan(4 * crowded.points);
    expect(crowded.points).toBeGreaterThanOrEqual(10); // a careful check always earns the base
  });

  it("explains every point it awards", () => {
    const v = missionValue(site(), { checksThisSeason: 0 }, NOW, 0.5);
    expect(v.parts.every((p) => p.reason.length > 0)).toBe(true);
    expect(v.parts.reduce((s, p) => s + p.points, 0)).toBe(v.points);
    expect(v.parts.find((p) => p.key === "labStaleness")?.reason).toContain("Jun 2023");
  });

  it("values citizen-only sites even without lab or urban data", () => {
    const v = missionValue(site({ kind: "citizen", lastLabDate: null, labRiskScore: null }), { checksThisSeason: 0 }, NOW, null);
    expect(v.parts.map((p) => p.key)).toContain("noLabRecord");
    expect(v.points).toBe(10 + 25 + 30);
  });

  it("caps lab staleness", () => {
    const old = missionValue(site({ lastLabDate: "2010-01-01" }), { checksThisSeason: 0 }, NOW, null);
    const part = old.parts.find((p) => p.key === "labStaleness")!;
    expect(part.points).toBe(40);
  });
});

describe("helpers", () => {
  it("counts months", () => expect(monthsBetween("2023-06-28", NOW)).toBe(39));
  it("ranks percentiles and keeps unknowns", () => expect(percentileRanks([3, null, 1, 2])).toEqual([1, null, 0, 0.5]));
  it("assigns meteorological seasons", () => {
    expect(seasonKey(NOW)).toBe("2026-autumn");
    expect(seasonKey(new Date("2026-12-05T00:00:00Z"))).toBe("2027-winter");
    expect(seasonKey(new Date("2027-01-05T00:00:00Z"))).toBe("2027-winter");
  });
});
