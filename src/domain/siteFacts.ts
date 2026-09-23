// Joins the OneAquaHealth snapshot into one fact record per stream site.
import citiesJson from "../data/oah/cities.json";
import sitesJson from "../data/oah/sites.json";
import userSitesJson from "../data/oah/userSites.json";
import healthRisksJson from "../data/oah/healthRisks.json";
import urbanJson from "../data/oah/urbanParameters.json";

export interface SiteFacts {
  code: string;
  name: string;
  cityId: string | null; // null for citizen-created sites outside the 5 research cities
  cityName: string | null;
  lat: number;
  lon: number;
  kind: "research" | "citizen";
  /** Most recent OAH lab health-risk campaign (ISO date), null if none on record. */
  lastLabDate: string | null;
  /** OAH lab health-risk score 0..1 from that campaign, null if none. */
  labRiskScore: number | null;
  /** Human density proxy within 250 m (OAH urban parameters), null if unknown. */
  peopleNearby: number | null;
}

interface RawSite { code: string; name: string; city: { id: string; name: string }; latitude: number; longitude: number }
interface RawUserSite { userSiteCode: string; name: string; latitude: number; longitude: number }
interface RawRisk { researchSiteCode: string; samplingDate: string; healthRiskScore: number }
interface RawUrban { researchSiteCode: string; humanDensityProxy250m: number | null }

export function buildSiteFacts(
  sites: RawSite[] = sitesJson as RawSite[],
  userSites: RawUserSite[] = userSitesJson as RawUserSite[],
  risks: RawRisk[] = healthRisksJson as RawRisk[],
  urban: RawUrban[] = urbanJson as RawUrban[],
): SiteFacts[] {
  const latestRisk = new Map<string, RawRisk>();
  for (const r of risks) {
    const prev = latestRisk.get(r.researchSiteCode);
    if (!prev || r.samplingDate > prev.samplingDate) latestRisk.set(r.researchSiteCode, r);
  }
  const people = new Map(urban.map((u) => [u.researchSiteCode, u.humanDensityProxy250m]));

  const research: SiteFacts[] = sites.map((s) => {
    const risk = latestRisk.get(s.code);
    return {
      code: s.code,
      name: s.name,
      cityId: s.city.id,
      cityName: s.city.name,
      lat: s.latitude,
      lon: s.longitude,
      kind: "research",
      lastLabDate: risk ? risk.samplingDate.slice(0, 10) : null,
      labRiskScore: risk ? risk.healthRiskScore : null,
      peopleNearby: people.get(s.code) ?? null,
    };
  });
  const citizen: SiteFacts[] = userSites.map((s) => ({
    code: s.userSiteCode,
    name: s.name,
    cityId: null,
    cityName: null,
    lat: s.latitude,
    lon: s.longitude,
    kind: "citizen",
    lastLabDate: null,
    labRiskScore: null,
    peopleNearby: null,
  }));
  return [...research, ...citizen];
}

export const CITIES = citiesJson as { id: string; name: string; latitude: number; longitude: number }[];
