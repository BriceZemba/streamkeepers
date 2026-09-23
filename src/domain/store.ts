// Local store for this device's checks, plus the clearly labelled demo seed of
// community activity. Friday's build moves the system of record to the
// OneAquaHealth FHIR server; this module stays as the offline queue.
import { seasonKey } from "./missionValue";
import type { CheckSubmission, GateResult } from "./qualityGate";

export interface StoredCheck extends CheckSubmission {
  id: string;
  gate: GateResult;
  /** Points promised by the mission at submission time. */
  missionPoints: number;
  /** Points actually credited: missionPoints if accepted, 0 while under review or for a same-day repeat. */
  creditedPoints: number;
}

/**
 * SIMULATED community activity for the demo: accepted checks this season by
 * other volunteers. Not real OneAquaHealth data; the UI labels it as simulated
 * and it can be switched off.
 */
export const SIMULATED_COMMUNITY_CHECKS: Record<string, number> = {
  C1: 9, C3: 4, C10: 2, C12: 1,
  T1: 7, T3: 2,
  G1: 6, G2: 3,
  BN1: 5, BN2: 1,
  O1: 8, O2: 2,
};

const KEY_CHECKS = "sk.checks.v1";
const KEY_KEEPER = "sk.keeper.v1";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked (private mode): the check still shows on screen.
  }
}

export function loadChecks(): StoredCheck[] {
  return read<StoredCheck[]>(KEY_CHECKS, []);
}

export function saveCheck(c: StoredCheck): StoredCheck[] {
  const all = [...loadChecks(), c];
  write(KEY_CHECKS, all);
  return all;
}

export function clearChecks() {
  write(KEY_CHECKS, []);
}

export interface Keeper {
  id: string;
  name: string;
}

export function loadKeeper(): Keeper {
  const k = read<Keeper | null>(KEY_KEEPER, null);
  if (k) return k;
  const fresh = { id: crypto.randomUUID(), name: "" };
  write(KEY_KEEPER, fresh);
  return fresh;
}

export function saveKeeper(k: Keeper) {
  write(KEY_KEEPER, k);
}

/** Accepted checks per site in the season of `now` (own device + optional simulated community). */
export function checksThisSeason(checks: StoredCheck[], now: Date, includeSimulated: boolean): Map<string, number> {
  const season = seasonKey(now);
  const counts = new Map<string, number>();
  if (includeSimulated) for (const [code, n] of Object.entries(SIMULATED_COMMUNITY_CHECKS)) counts.set(code, n);
  for (const c of checks) {
    if (c.gate.outcome !== "ACCEPTED" || c.gate.noNewPoints) continue;
    if (seasonKey(new Date(c.submittedAt)) !== season) continue;
    counts.set(c.siteCode, (counts.get(c.siteCode) ?? 0) + 1);
  }
  return counts;
}
