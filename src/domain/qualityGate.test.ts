import { describe, expect, it } from "vitest";
import { evaluate, contradictions, type CheckSubmission } from "./qualityGate";
import type { Answers } from "./checkForm";

const cleanStream: Answers = {
  water_flow: "NOR", water_color: ["CL"], channel_type: "NAT", channel_form: "U", bank_type: "NAT",
  habitats: ["SD", "AV"], fallen_biomass: ["FB"], draining_pipes: "NO", sewage_signs: "NO", barriers: "NO",
  construction: "NO", invasive_species: "NO", vegetation_left: ["H", "T"], vegetation_right: ["B"], impervious: "NONE",
  overall: "GOOD",
};

const pollutedStream: Answers = {
  water_flow: "STA", water_color: ["MU", "FO"], channel_type: "ART", channel_form: "V", bank_type: "ART",
  habitats: [], fallen_biomass: [], draining_pipes: "FLOWING", sewage_signs: "YES", barriers: "YES",
  construction: "NO", invasive_species: "UNSURE", vegetation_left: ["H"], vegetation_right: [], impervious: "MOST",
  overall: "POOR",
};

const sub = (answers: Answers, over: Partial<CheckSubmission> = {}): CheckSubmission => ({
  siteCode: "C5", keeperId: "k1", startedAt: "2026-09-24T10:00:00Z", submittedAt: "2026-09-24T10:04:00Z",
  answers, distanceM: 40, practice: false, ...over,
});

describe("quality gate", () => {
  it("accepts a careful, consistent report of a clean stream", () => {
    expect(evaluate(sub(cleanStream), []).outcome).toBe("ACCEPTED");
  });

  it("accepts a careful, consistent report of a polluted stream: pollution is never penalised", () => {
    expect(evaluate(sub(pollutedStream), []).outcome).toBe("ACCEPTED");
  });

  it("holds a 25-second rush for review, whatever it says", () => {
    const rushed = sub(pollutedStream, { submittedAt: "2026-09-24T10:00:25Z" });
    const r = evaluate(rushed, []);
    expect(r.outcome).toBe("REVIEW");
    expect(r.results.find((x) => x.rule === "careful")!.passed).toBe(false);
  });

  it("questions 'Good' when sewage was reported", () => {
    const r = evaluate(sub({ ...pollutedStream, overall: "GOOD" }), []);
    expect(r.outcome).toBe("REVIEW");
    expect(r.results.find((x) => x.rule === "consistent")!.message).toMatch(/rated the stream Good/);
  });

  it("questions 'Poor' symmetrically when everything reported is natural and clear", () => {
    expect(contradictions({ ...cleanStream, overall: "POOR" }).map((c) => c.key)).toEqual(["gate.c.poorNatural"]);
  });

  it("holds reports made far from the site, but not in practice mode", () => {
    expect(evaluate(sub(cleanStream, { distanceM: 5200 }), []).outcome).toBe("REVIEW");
    expect(evaluate(sub(cleanStream, { distanceM: null, practice: true }), []).outcome).toBe("ACCEPTED");
  });

  it("holds reports that are mostly 'not sure'", () => {
    const unsure: Answers = Object.fromEntries(Object.entries(cleanStream).map(([k, v]) => [k, Array.isArray(v) ? ["UNSURE"] : "UNSURE"]));
    unsure.water_flow = "NOR";
    unsure.overall = "MODERATE";
    expect(evaluate(sub(unsure), []).outcome).toBe("REVIEW");
  });

  it("keeps a same-day repeat as data but gives no new points", () => {
    const first = sub(cleanStream);
    const r = evaluate(sub(cleanStream, { submittedAt: "2026-09-24T15:00:00Z", startedAt: "2026-09-24T14:55:00Z" }), [first]);
    expect(r.outcome).toBe("ACCEPTED");
    expect(r.noNewPoints).toBe(true);
  });

  it("does not ask about water colour for a dry bed", () => {
    const dry: Answers = { ...cleanStream, water_flow: "DRY", water_color: undefined, habitats: ["SB"] };
    expect(evaluate(sub(dry), []).outcome).toBe("ACCEPTED");
  });
});
