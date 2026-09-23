import { describe, expect, it } from "vitest";
import { applyReview, isAccepted, isPending } from "../domain/review";
import type { StoredCheck } from "../domain/store";
import type { SiteFacts } from "../domain/siteFacts";
import { PROFILE_OBS } from "./mapping";
import { reviewBundle } from "./review";

const site: SiteFacts = { code: "C5", name: "Mina Hospital", cityId: "CO", cityName: "Coimbra", lat: 40.2186, lon: -8.4273, kind: "research", lastLabDate: "2023-06-28", labRiskScore: 0.78, peopleNearby: 12 };

const held: StoredCheck = {
  id: "chk-9", siteCode: "C5", keeperId: "k1", startedAt: "2026-09-24T10:00:00Z", submittedAt: "2026-09-24T10:00:40Z",
  answers: { water_flow: "NOR", water_color: ["FO"], channel_type: "ART", channel_form: "V", bank_type: "ART", habitats: [], fallen_biomass: [],
    draining_pipes: "FLOWING", sewage_signs: "YES", barriers: "NO", construction: "NO", invasive_species: "NO", vegetation_left: ["H"], vegetation_right: ["H"], impervious: "MOST", overall: "POOR" },
  distanceM: 20, practice: false, missionPoints: 116, creditedPoints: 0,
  gate: { outcome: "REVIEW", noNewPoints: false, results: [{ rule: "careful", passed: false, message: "Finished in 40 s.", msgs: [] }] },
};
const synced: StoredCheck = {
  ...held,
  sync: { server: "https://x/fhir", ok: true, at: "2026-09-24T10:01:00Z", verified: [], refs: ["Questionnaire/1", "Location/2", "Practitioner/3", "QuestionnaireResponse/4"] },
};
const at = "2026-09-25T09:00:00Z";

describe("review decisions", () => {
  it("credits the points on acceptance and keeps the check either way", () => {
    const a = applyReview(held, { decision: "accepted", reviewer: "Maria", at });
    expect(a.creditedPoints).toBe(116);
    expect(isAccepted(a)).toBe(true);
    expect(isPending(a)).toBe(false);
    const r = applyReview(held, { decision: "rejected", reason: "rushed", reviewer: "Maria", at });
    expect(r.creditedPoints).toBe(0);
    expect(isAccepted(r)).toBe(false);
    expect(r.answers).toEqual(held.answers);
  });

  it("refuses to review twice, to review a check the gate accepted, or to reject without a reason", () => {
    const a = applyReview(held, { decision: "accepted", reviewer: "M", at });
    expect(() => applyReview(a, { decision: "rejected", reason: "other", reviewer: "M", at })).toThrow();
    expect(() => applyReview({ ...held, gate: { ...held.gate, outcome: "ACCEPTED" } }, { decision: "accepted", reviewer: "M", at })).toThrow();
    expect(() => applyReview(held, { decision: "rejected", reviewer: "M", at })).toThrow();
  });
});

describe("review FHIR bundle", () => {
  const types = (b: ReturnType<typeof reviewBundle>) => b.entry.map((e) => e.resource.resourceType);

  it("accepted: OAH Observations derived from the stored QuestionnaireResponse, plus a verifier Provenance", () => {
    const b = reviewBundle(applyReview(synced, { decision: "accepted", reviewer: "Maria", at }), site);
    const obs = b.entry.filter((e) => e.resource.resourceType === "Observation").map((e) => e.resource as Record<string, any>); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(obs.length).toBeGreaterThan(0);
    for (const o of obs) {
      expect(o.meta.profile).toEqual([PROFILE_OBS]);
      expect(o.derivedFrom[0].reference).toBe("QuestionnaireResponse/4");
      expect(o.subject.reference).toBe("Location/2");
      expect(o.performer[0].reference).toBe("Practitioner/3");
    }
    const prov = b.entry.at(-1)!.resource as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(prov.resourceType).toBe("Provenance");
    expect(prov.agent[0].type.coding[0].code).toBe("verifier");
    expect(prov.agent[0].who.display).toBe("Maria");
    expect(prov.target).toHaveLength(1 + obs.length);
    expect(types(b)).not.toContain("QuestionnaireResponse"); // not re-sent
  });

  it("rejected: only a Provenance with the reason", () => {
    const b = reviewBundle(applyReview(synced, { decision: "rejected", reason: "wrong_place", reviewer: "Maria", at }), site);
    expect(types(b)).toEqual(["Provenance"]);
    expect(JSON.stringify(b)).toContain("Rejected: wrong_place");
  });

  it("never synced: sends the whole check with the decision", () => {
    const b = reviewBundle(applyReview(held, { decision: "accepted", reviewer: "Maria", at }), site);
    expect(types(b)).toEqual(expect.arrayContaining(["QuestionnaireResponse", "Observation", "Provenance", "Location"]));
  });
});
