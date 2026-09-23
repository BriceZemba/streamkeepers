// Writes example FHIR bundles exactly as the app builds them, for validation with
// the official HL7 validator against the OneAquaHealth IG (see docs/FHIR-VALIDATION.md).
// Usage: npm run fhir:examples
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { buildSiteFacts } from "../src/domain/siteFacts";
import { evaluate } from "../src/domain/qualityGate";
import { applyReview } from "../src/domain/review";
import type { StoredCheck } from "../src/domain/store";
import { checkBundle, questionnaire } from "../src/fhir/mapping";
import { reviewBundle } from "../src/fhir/review";

const site = buildSiteFacts().find((s) => s.code === "C5")!;
const answers = {
  water_flow: "NOR", water_color: ["MU", "FO"], channel_type: "ART", channel_form: "U", bank_type: "LAS",
  habitats: ["SD"], fallen_biomass: [], draining_pipes: "FLOWING", sewage_signs: "YES", barriers: "NO",
  construction: "NO", invasive_species: "UNSURE", vegetation_left: ["H", "B"], vegetation_right: ["T"], impervious: "SOME", overall: "POOR",
};

function check(seconds: number, id: string): StoredCheck {
  const submittedAt = "2026-09-24T10:05:00Z";
  const sub = { siteCode: site.code, keeperId: "example-keeper", practice: false, answers, distanceM: 40, startedAt: new Date(Date.parse(submittedAt) - seconds * 1000).toISOString(), submittedAt };
  const gate = evaluate(sub, []);
  return { ...sub, id, gate, missionPoints: 116, creditedPoints: gate.outcome === "ACCEPTED" ? 116 : 0 };
}

async function main() {
  const dir = join(import.meta.dirname, "..", "eval", "fhir");
  await mkdir(dir, { recursive: true });
  const accepted = check(240, "example-accepted");
  const held = check(25, "example-held");
  const reviewed = applyReview(held, { decision: "accepted", reviewer: "Example reviewer", at: "2026-09-25T09:00:00Z" });
  const files: Record<string, unknown> = {
    "accepted-check.json": checkBundle(accepted, site),
    "held-check.json": checkBundle(held, site),
    "reviewed-check.json": reviewBundle(reviewed, site),
  };
  // The Questionnaire, so the validator can check answers against it.
  const qdir = join(import.meta.dirname, "..", "fhir", "questionnaire");
  await mkdir(qdir, { recursive: true });
  await writeFile(join(qdir, "Questionnaire-stream-check.json"), JSON.stringify({ id: "stream-check", ...questionnaire() }, null, 1) + "\n");
  for (const [name, bundle] of Object.entries(files)) {
    await writeFile(join(dir, name), JSON.stringify(bundle, null, 1) + "\n");
    console.log("wrote", name, (bundle as { entry: unknown[] }).entry.length, "entries");
  }
}

main();
