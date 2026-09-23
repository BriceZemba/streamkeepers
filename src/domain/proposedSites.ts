// Streams volunteers propose. They live on the phone as "proposed" until a
// coordinator approves them (then they become a FHIR Location) or rejects them.
import { distanceM } from "./geo";
import type { SiteFacts } from "./siteFacts";
import type { SyncResult } from "../fhir/client";

export interface ProposedSite {
  code: string; // "SK-" + random
  name: string;
  lat: number;
  lon: number;
  createdAt: string;
  keeperId: string;
  status: "proposed" | "approved" | "rejected";
  decidedAt?: string;
  reviewer?: string;
  sync?: SyncResult;
}

export const DUPLICATE_RADIUS_M = 150;

/** The closest existing site within the radius, if any: suggest it instead of a duplicate. */
export function nearbySite(sites: SiteFacts[], lat: number, lon: number, radiusM = DUPLICATE_RADIUS_M): SiteFacts | null {
  let best: SiteFacts | null = null;
  let bestD = Infinity;
  for (const s of sites) {
    const d = distanceM(lat, lon, s.lat, s.lon);
    if (d <= radiusM && d < bestD) { best = s; bestD = d; }
  }
  return best;
}

/** Translation key of the problem with a proposed name, or null if it is fine. */
export function nameProblem(name: string): string | null {
  const n = name.trim();
  if (n.length < 3) return "add.nameShort";
  if (n.length > 60) return "add.nameLong";
  if (!/\p{L}/u.test(n)) return "add.nameLetters";
  return null;
}

export function proposeSite(name: string, lat: number, lon: number, keeperId: string, now: Date, existing: SiteFacts[]): ProposedSite {
  if (nameProblem(name)) throw new Error("Invalid name");
  if (nearbySite(existing, lat, lon)) throw new Error("A site already exists here");
  return {
    code: `SK-${crypto.randomUUID().slice(0, 8)}`,
    name: name.trim(),
    lat, lon,
    createdAt: now.toISOString(),
    keeperId,
    status: "proposed",
  };
}

export function toFacts(p: ProposedSite): SiteFacts {
  return {
    code: p.code, name: p.name, cityId: null, cityName: null, lat: p.lat, lon: p.lon, kind: "citizen",
    lastLabDate: null, labRiskScore: null, peopleNearby: null,
    status: p.status === "approved" ? "approved" : "proposed",
    proposedAt: p.createdAt,
  };
}

const KEY = "sk.sites.v1";
export function loadProposed(): ProposedSite[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]") as ProposedSite[]; } catch { return []; }
}
export function saveProposed(all: ProposedSite[]) {
  try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* storage blocked */ }
}
