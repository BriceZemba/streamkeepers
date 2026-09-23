// Snapshot the public OneAquaHealth (ENORA) API into src/data/oah/.
// The app reads these committed files by default, so the demo keeps working
// if the live API is down during judging. Run: npm run snapshot
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const API = "https://api.enora-oah.eu/api";
const OUT = join(import.meta.dirname, "..", "src", "data", "oah");

const ENDPOINTS: Record<string, string> = {
  cities: "/cities/all",
  sites: "/sites/all",
  userSites: "/sites/user-generated",
  healthRisks: "/resilience-map/health-risks",
  urbanParameters: "/resilience-map/urban-parameters",
  // Answer vocabularies of the official OneAquaHealth Citizen Science App
  channelForms: "/citizens/channel_forms",
  channelTypes: "/citizens/channel_types",
  bankTypes: "/citizens/bank_types",
  habitats: "/citizens/habitats",
  fallenBiomass: "/citizens/fallen_biomass",
  waterFlows: "/citizens/water_flows",
  waterColors: "/citizens/water_colors",
  vegetationTypes: "/citizens/vegetation_types",
  streamAssessments: "/citizens/stream_assessments",
};

async function main() {
  await mkdir(OUT, { recursive: true });
  const manifest: Record<string, { url: string; fetchedAt: string; sha256: string; records: number }> = {};
  for (const [name, path] of Object.entries(ENDPOINTS)) {
    const url = API + path;
    // The API rejects some default client user agents with 403.
    const res = await fetch(url, { headers: { "User-Agent": "streamkeepers-snapshot/0.1" } });
    if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
    const body = await res.text();
    const data = JSON.parse(body);
    await writeFile(join(OUT, `${name}.json`), JSON.stringify(data, null, 1) + "\n");
    manifest[name] = {
      url,
      fetchedAt: new Date().toISOString(),
      sha256: createHash("sha256").update(body).digest("hex"),
      records: Array.isArray(data) ? data.length : 1,
    };
    console.log(`${name.padEnd(18)} ${String(manifest[name].records).padStart(4)} records`);
  }
  await writeFile(join(OUT, "manifest.json"), JSON.stringify(manifest, null, 1) + "\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
