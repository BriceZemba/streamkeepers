import { describe, expect, it } from "vitest";
import { STEPS } from "../domain/checkForm";
import { en } from "./en";
import { pt } from "./pt";
import { fr } from "./fr";

// Every key the domain can emit (steps, questions, options, reasons, gate messages).
const DOMAIN_KEYS = [
  ...STEPS.map((s) => `step.${s.id}`),
  ...STEPS.flatMap((s) => s.questions).flatMap((q) => [
    `q.${q.id}.title`, `q.${q.id}.term`, `q.${q.id}.help`,
    ...q.options.flatMap((o) => {
      const base = ["YES", "NO"].includes(o.code) && q.options.length === 2 ? `opt.${o.code}` : `opt.${q.id.startsWith("vegetation_") ? "vegetation" : q.id}.${o.code}`;
      return [`${base}.label`, ...(o.hint ? [`${base}.hint`] : [])];
    }),
  ]),
  "reason.base", "reason.labStaleness", "reason.noLabRecord", "reason.seasonGap", "reason.labRisk",
  "reason.peopleHigh", "reason.peopleLow", "reason.adopted", "reason.coverage",
  "gate.complete.missing", "gate.complete.unsure", "gate.complete.ok", "gate.careful.ok", "gate.careful.fast",
  "gate.atSite.practice", "gate.atSite.noGps", "gate.atSite.ok", "gate.atSite.far", "gate.consistent.ok",
  "gate.c.goodPolluted", "gate.c.poorNatural", "gate.c.clearMuddy", "gate.c.unsureAndOption", "gate.c.dryWater",
  "gate.dup.yes", "gate.dup.no",
];

describe.each([["pt", pt], ["fr", fr]] as const)("%s translation", (_, dict) => {
  it("covers every interface string", () => {
    expect(Object.keys(en).filter((k) => !(k in dict))).toEqual([]);
  });
  it("covers every question, answer, reason and gate message", () => {
    expect(DOMAIN_KEYS.filter((k) => !(k in dict))).toEqual([]);
  });
  it("keeps the same {placeholders} as English", () => {
    const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
    expect(Object.keys(en).filter((k) => ph(en[k]) !== ph(dict[k] ?? ""))).toEqual([]);
  });
});
