import { describe, expect, it } from "vitest";
import { checkBundle, indicatorDrafts, PROFILE_OBS, PROFILE_LOC, OAH_CS } from "./mapping";
import { refFromLocation, checkStored } from "./client";
import type { StoredCheck } from "../domain/store";
import type { SiteFacts } from "../domain/siteFacts";
import type { Answers } from "../domain/checkForm";

const site: SiteFacts = { code: "C5", name: "Mina Hospital", cityId: "CO", cityName: "Coimbra", lat: 40.2186, lon: -8.4273, kind: "research", lastLabDate: "2023-06-28", labRiskScore: 0.78, peopleNearby: 12 };

const answers: Answers = {
  water_flow: "STA", water_color: ["MU", "FO"], channel_type: "ART", channel_form: "V", bank_type: "ART",
  habitats: [], fallen_biomass: ["FB"], draining_pipes: "FLOWING", sewage_signs: "YES", barriers: "NO",
  construction: "UNSURE", invasive_species: "NO", vegetation_left: ["H"], vegetation_right: ["UNSURE"], impervious: "MOST", overall: "POOR",
};

const check = (outcome: "ACCEPTED" | "REVIEW", practice = false): StoredCheck => ({
  id: "chk-1", siteCode: "C5", keeperId: "keeper-1", startedAt: "2026-09-24T10:00:00Z", submittedAt: "2026-09-24T10:04:00Z",
  answers, distanceM: 30, practice, missionPoints: 117, creditedPoints: outcome === "ACCEPTED" ? 117 : 0,
  gate: { outcome, noNewPoints: false, results: [{ rule: "careful", passed: outcome === "ACCEPTED", message: "Took 240 s.", msgs: [] }] },
});

const byType = (b: ReturnType<typeof checkBundle>, t: string) => b.entry.filter((e) => e.resource.resourceType === t);

describe("FHIR transaction bundle", () => {
  it("creates Location, keeper and Questionnaire only if absent (conditional create)", () => {
    const b = checkBundle(check("ACCEPTED"), site);
    expect(byType(b, "Location")[0].request.ifNoneExist).toBe("identifier=https://api.enora-oah.eu/api/sites|C5");
    expect(byType(b, "Practitioner")[0].request.ifNoneExist).toContain("keeper-1");
    expect(byType(b, "Questionnaire")[0].request.ifNoneExist).toContain("version=0.1.0");
    expect(byType(b, "Location")[0].resource.meta).toMatchObject({ profile: [PROFILE_LOC] });
  });

  it("writes OAH indicator Observations only for gate-passed checks", () => {
    expect(byType(checkBundle(check("ACCEPTED"), site), "Observation").length).toBeGreaterThan(0);
    expect(byType(checkBundle(check("REVIEW"), site), "Observation")).toHaveLength(0);
    expect(byType(checkBundle(check("REVIEW"), site), "QuestionnaireResponse")).toHaveLength(1);
  });

  it("follows the observation-indicators-oah constraints", () => {
    for (const e of byType(checkBundle(check("ACCEPTED"), site), "Observation")) {
      const o = e.resource as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
      expect(o.meta.profile).toEqual([PROFILE_OBS]);
      expect(o.status).toBe("final");
      expect(o.subject.reference).toMatch(/^urn:uuid:/);
      expect(o.performer).toHaveLength(1);
      expect(o.effectiveDateTime).toBe("2026-09-24T10:04:00Z");
      expect(o.code.coding[0].code).toBeTruthy();
      for (const c of o.component ?? []) expect(c.valueCodeableConcept ?? c.valueString ?? c.valueQuantity).toBeTruthy();
    }
  });

  it("uses OAH indicator codes and never turns 'not sure' into data", () => {
    const d = indicatorDrafts(answers);
    const codes = d.map((x) => (x.code as any).coding[0].code); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(codes).toEqual(expect.arrayContaining(["morophology", "hydrology", "foam", "riparianVegetation", "LandUse", "invasiveOrganisms"]));
    const land = d.find((x) => (x.code as any).coding[0].code === "LandUse")!; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(JSON.stringify(land.components)).not.toContain("construction"); // construction was "not sure"
    const veg = d.find((x) => (x.code as any).coding[0].code === "riparianVegetation")!; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(veg.components).toHaveLength(3); // left bank only; right bank was "not sure"
    expect(JSON.stringify(veg)).toContain(OAH_CS);
  });

  it("labels practice checks as test data", () => {
    const qr = byType(checkBundle(check("ACCEPTED", true), site), "QuestionnaireResponse")[0].resource as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(qr.meta.security[0].code).toBe("HTEST");
  });
});

describe("read-back", () => {
  it("parses transaction locations", () => {
    expect(refFromLocation("Observation/123/_history/1")).toBe("Observation/123");
    expect(refFromLocation("https://hapi.fhir.org/baseR4/Location/9/_history/2")).toBe("Location/9");
  });
  it("flags a stored Observation that lost its profile or status", () => {
    const sent = byType(checkBundle(check("ACCEPTED"), site), "Observation")[0].resource;
    const stored = { ...sent, status: "preliminary", meta: { tag: (sent.meta as any).tag }, subject: { reference: "Location/1" } }; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(checkStored(sent, stored)).toEqual(expect.arrayContaining(["status preliminary", "OAH profile not declared"]));
  });
});
