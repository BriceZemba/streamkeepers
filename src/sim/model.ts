// Agent-based simulation of one season of volunteer stream checks on the real
// OneAquaHealth research sites. SIMULATED volunteers, REAL sites and site data.
//
// Question: does pricing missions from OAH data gaps spread checks to the sites
// that need them, compared with classic flat points per report? And how much of
// that comes from the OAH data itself (ablation)?
//
// Mission values come from the app's own missionValue(), precomputed per site for
// 0..MAX_N checks this season, so the simulation scores exactly what the app shows.
import { distanceM } from "../domain/geo";
import { DEFAULT_WEIGHTS, missionValue, percentileRanks, type Weights } from "../domain/missionValue";
import type { SiteFacts } from "../domain/siteFacts";

export type Scheme = "flat" | "value" | "valueNoOah";
export const SCHEMES: Scheme[] = ["flat", "value", "valueNoOah"];

export interface SimParams {
  volunteersPerCity: number;
  weeks: number;
  /** Chance that a volunteer makes a check in a given week. */
  tripProb: number;
  /** How strongly volunteers follow points (utility per 100 pts). 0 = points ignored. */
  betaPoints: number;
  /** Pull of popular, populated places (utility at the most populated site). */
  alphaPopularity: number;
  /** Distance cost: utility lost per this many km. */
  distScaleKm: number;
  /** Volunteers never travel further than this. */
  maxKm: number;
  seed: number;
}

export const DEFAULT_PARAMS: Omit<SimParams, "seed"> = {
  volunteersPerCity: 20,
  weeks: 13,
  tripProb: 0.25,
  betaPoints: 1,
  alphaPopularity: 1,
  distScaleKm: 2,
  maxKm: 15,
};

const MAX_N = 60;

/** Deterministic PRNG (mulberry32) so every run is reproducible from its seed. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const gaussian = (r: () => number) => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());

export interface SimSite {
  site: SiteFacts;
  peoplePct: number | null;
  /** Mission points by number of checks already made this season, per scheme. */
  points: Record<Scheme, number[]>;
}

/** Precompute mission values with the app's scoring code. */
export function prepareSites(research: SiteFacts[], seasonStart: Date, weights: Weights = DEFAULT_WEIGHTS): SimSite[] {
  const pct = percentileRanks(research.map((s) => s.peopleNearby));
  return research.map((site, i) => {
    const noOah: SiteFacts = { ...site, lastLabDate: null, labRiskScore: null, peopleNearby: null };
    const table = (f: SiteFacts, p: number | null) =>
      Array.from({ length: MAX_N + 1 }, (_, n) => missionValue(f, { checksThisSeason: n }, seasonStart, p, weights).points);
    return {
      site,
      peoplePct: pct[i],
      points: {
        flat: Array(MAX_N + 1).fill(10),
        value: table(site, pct[i]),
        valueNoOah: table(noOah, null),
      },
    };
  });
}

export interface SeasonResult {
  checks: number[]; // per site, same order as sites
  travelKm: number[]; // per trip
}

export function simulateSeason(sites: SimSite[], scheme: Scheme, p: SimParams): SeasonResult {
  const r = rng(p.seed);
  const checks = new Array(sites.length).fill(0);
  const travelKm: number[] = [];
  const cities = [...new Set(sites.map((s) => s.site.cityId))];

  // Volunteers live mostly where people live: anchor at a site weighted by population, plus ~1.5 km jitter.
  const volunteers: { city: string | null; lat: number; lon: number }[] = [];
  for (const city of cities) {
    const idx = sites.map((s, i) => (s.site.cityId === city ? i : -1)).filter((i) => i >= 0);
    const w = idx.map((i) => 0.2 + (sites[i].peoplePct ?? 0.3));
    const total = w.reduce((a, b) => a + b, 0);
    for (let v = 0; v < p.volunteersPerCity; v++) {
      let x = r() * total, k = 0;
      while (x > w[k] && k < w.length - 1) x -= w[k++];
      const a = sites[idx[k]].site;
      volunteers.push({ city, lat: a.lat + (gaussian(r) * 1.5) / 111, lon: a.lon + (gaussian(r) * 1.5) / (111 * Math.cos((a.lat * Math.PI) / 180)) });
    }
  }

  for (let week = 0; week < p.weeks; week++) {
    for (const vol of volunteers) {
      if (r() >= p.tripProb) continue;
      const options: { i: number; u: number; km: number }[] = [];
      sites.forEach((s, i) => {
        if (s.site.cityId !== vol.city) return;
        const km = distanceM(vol.lat, vol.lon, s.site.lat, s.site.lon) / 1000;
        if (km > p.maxKm) return;
        const pts = s.points[scheme][Math.min(checks[i], MAX_N)];
        const u = -km / p.distScaleKm + p.alphaPopularity * (s.peoplePct ?? 0.3) + (p.betaPoints * pts) / 100;
        options.push({ i, u, km });
      });
      if (options.length === 0) continue;
      const max = Math.max(...options.map((o) => o.u));
      const weights = options.map((o) => Math.exp(o.u - max));
      let x = r() * weights.reduce((a, b) => a + b, 0), k = 0;
      while (x > weights[k] && k < weights.length - 1) x -= weights[k++];
      checks[options[k].i]++;
      travelKm.push(options[k].km);
    }
  }
  return { checks, travelKm };
}

export interface Metrics {
  totalChecks: number;
  /** Share of research sites with at least one check this season. */
  coverage: number;
  /** Share of the highest lab-risk quartile checked at least once. */
  highRiskCoverage: number;
  /** Share of all checks made at the highest lab-risk quartile (a quarter of sites). */
  highRiskShare: number;
  /** Share of all checks landing on the 10% most-visited sites. */
  top10Share: number;
  medianTravelKm: number;
}

export function metrics(sites: SimSite[], res: SeasonResult): Metrics {
  const n = sites.length;
  const total = res.checks.reduce((a, b) => a + b, 0);
  const risks = sites.map((s) => s.site.labRiskScore).filter((x): x is number => x !== null).sort((a, b) => a - b);
  const q3 = risks[Math.floor(risks.length * 0.75)];
  const high = sites.map((s, i) => ({ s, i })).filter(({ s }) => s.site.labRiskScore !== null && s.site.labRiskScore >= q3);
  const sorted = [...res.checks].sort((a, b) => b - a);
  const top = sorted.slice(0, Math.max(1, Math.round(n * 0.1))).reduce((a, b) => a + b, 0);
  const km = [...res.travelKm].sort((a, b) => a - b);
  return {
    totalChecks: total,
    coverage: res.checks.filter((c) => c > 0).length / n,
    highRiskCoverage: high.filter(({ i }) => res.checks[i] > 0).length / high.length,
    highRiskShare: total ? high.reduce((a, { i }) => a + res.checks[i], 0) / total : 0,
    top10Share: total ? top / total : 0,
    medianTravelKm: km.length ? km[Math.floor(km.length / 2)] : 0,
  };
}
