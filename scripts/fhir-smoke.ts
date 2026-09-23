// End-to-end FHIR check: builds a practice check for OAH site C5, posts it as a
// transaction and verifies it by independent reads.
// Usage: npm run fhir:smoke -- [oah|hapi]   (default: oah, falls back to hapi)
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { buildSiteFacts } from "../src/domain/siteFacts";
import { evaluate } from "../src/domain/qualityGate";
import type { StoredCheck } from "../src/domain/store";
import { checkBundle } from "../src/fhir/mapping";
import { FHIR_SERVERS, syncCheck, type ServerKey } from "../src/fhir/client";

const answers = {
  water_flow: "NOR", water_color: ["MU", "FO"], channel_type: "ART", channel_form: "U", bank_type: "LAS",
  habitats: ["SD"], fallen_biomass: [], draining_pipes: "FLOWING", sewage_signs: "YES", barriers: "NO",
  construction: "NO", invasive_species: "UNSURE", vegetation_left: ["H", "B"], vegetation_right: ["T"], impervious: "SOME", overall: "POOR",
};

async function main() {
  const site = buildSiteFacts().find((s) => s.code === "C5")!;
  const now = new Date();
  const sub = {
    siteCode: site.code, keeperId: "smoke-test-keeper", practice: true, answers, distanceM: null,
    startedAt: new Date(now.getTime() - 4 * 60_000).toISOString(), submittedAt: now.toISOString(),
  };
  const gate = evaluate(sub, []);
  const check: StoredCheck = { ...sub, id: crypto.randomUUID(), gate, missionPoints: 117, creditedPoints: gate.outcome === "ACCEPTED" ? 117 : 0 };
  const bundle = checkBundle(check, site);

  const order: ServerKey[] = process.argv[2] ? [process.argv[2] as ServerKey] : ["oah", "hapi"];
  for (const key of order) {
    const base = FHIR_SERVERS[key].base;
    console.log(`\n→ ${FHIR_SERVERS[key].label}: ${base}`);
    const r = await syncCheck(base, bundle);
    if (r.error) { console.log(`  failed: ${r.error}`); continue; }
    for (const v of r.verified) console.log(`  ${v.ok ? "✓" : "✗"} ${v.ref.padEnd(34)} ${v.note}`);
    console.log(r.ok ? "  ALL VERIFIED" : "  VERIFICATION PROBLEMS");
    const dir = join(import.meta.dirname, "..", "eval");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "fhir_smoke_last.json"), JSON.stringify({ server: base, gate: gate.outcome, result: r }, null, 1) + "\n");
    if (r.ok) return;
  }
  process.exitCode = 1;
}

main();
