import { describe, expect, it } from "vitest";
import { buildSiteFacts } from "./siteFacts";
import { level, siteProfile } from "./siteProfile";
import { nameProblem, nearbySite, proposeSite, toFacts } from "./proposedSites";
import { missionValue } from "./missionValue";

const facts = buildSiteFacts();
const mina = facts.find((s) => s.code === "C5")!;
const NOW = new Date("2026-09-24T10:00:00Z");

describe("site profile (built only from OAH data)", () => {
  it("describes Mina Hospital from its lab campaign and land use", () => {
    const keys = siteProfile(mina).map((l) => l.key);
    expect(keys).toEqual(["about.lab", "about.pathogen", "about.fecal", "about.arg", "about.scaleNote", "about.land", "about.distances"]);
    const pathogen = siteProfile(mina).find((l) => l.key === "about.pathogen")!;
    expect(pathogen.params).toEqual({ level: "level.top", score: "1.00" });
    expect(siteProfile(mina).find((l) => l.key === "about.land")!.params).toEqual({ paved: 30, green: 47 });
  });

  it("says so when there is no lab data, instead of inventing a description", () => {
    const citizen = facts.find((s) => s.kind === "citizen")!;
    expect(siteProfile(citizen).map((l) => l.key)).toEqual(["about.citizen", "about.noLab"]);
  });

  it("maps scaled scores to relative levels", () => {
    expect([level(1), level(0.7), level(0.35), level(0.1)]).toEqual(["top", "high", "moderate", "low"]);
  });
});

describe("proposed sites", () => {
  it("refuses a duplicate within 150 m and points to the existing site", () => {
    expect(nearbySite(facts, mina.lat + 0.0005, mina.lon)?.code).toBe("C5"); // ~55 m away
    expect(() => proposeSite("My stream", mina.lat + 0.0005, mina.lon, "k", NOW, facts)).toThrow();
    expect(nearbySite(facts, mina.lat + 0.01, mina.lon + 0.01)).toBeNull();
  });

  it("checks the name", () => {
    expect(nameProblem("ab")).toBe("add.nameShort");
    expect(nameProblem("1234")).toBe("add.nameLetters");
    expect(nameProblem("Ribeira de Coselhas")).toBeNull();
  });

  it("earns only the base points until a coordinator approves it (no point farming)", () => {
    const p = proposeSite("Ribeira nova", mina.lat + 0.02, mina.lon + 0.02, "k", NOW, facts);
    const proposed = missionValue(toFacts(p), { checksThisSeason: 0 }, NOW, null);
    expect(proposed.points).toBe(10);
    expect(proposed.parts.map((x) => x.key)).toEqual(["base", "proposed"]);
    const approved = missionValue(toFacts({ ...p, status: "approved" }), { checksThisSeason: 0 }, NOW, null);
    expect(approved.points).toBe(10 + 25 + 30);
    expect(siteProfile(toFacts({ ...p, status: "approved" }))[0].key).toBe("about.approved");
  });
});
