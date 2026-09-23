// Local store for this device's checks, plus the clearly labelled demo seed of
// community activity. Friday's build moves the system of record to the
// OneAquaHealth FHIR server; this module stays as the offline queue.
import { seasonKey, seasonOrdinal } from "./missionValue";
import type { CheckSubmission, GateResult } from "./qualityGate";
import type { SyncResult } from "../fhir/client";
import { isAccepted, type Review } from "./review";

export interface StoredCheck extends CheckSubmission {
  id: string;
  gate: GateResult;
  /** Points promised by the mission at submission time. */
  missionPoints: number;
  /** Points actually credited: missionPoints if accepted, 0 while under review or for a same-day repeat. */
  creditedPoints: number;
  /** Last attempt to store this check on a FHIR server (absent = not tried yet). */
  sync?: SyncResult;
  /** Reviewer decision, for checks the quality gate held. */
  review?: Review;
  /** Last attempt to store the review (Observations + Provenance) on the FHIR server. */
  reviewSync?: SyncResult;
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

export function updateCheck(id: string, patch: Partial<StoredCheck>): StoredCheck[] {
  const all = loadChecks().map((c) => (c.id === id ? { ...c, ...patch } : c));
  write(KEY_CHECKS, all);
  return all;
}

export function clearChecks() {
  write(KEY_CHECKS, []);
}

export interface Keeper {
  id: string;
  name: string;
  /** Site code of the stream this volunteer adopted, if any. */
  adopted?: string | null;
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
    if (!isAccepted(c) || c.gate.noNewPoints) continue;
    if (seasonKey(new Date(c.submittedAt)) !== season) continue;
    counts.set(c.siteCode, (counts.get(c.siteCode) ?? 0) + 1);
  }
  return counts;
}

export interface Streak {
  /** Seasons in a row (ending this season, or last season if this one is still open) with an accepted check at the adopted stream. */
  count: number;
  /** The last four seasons, oldest first: ordinal and whether it has a check. */
  recent: { ordinal: number; done: boolean }[];
  /** True when the adopted stream still needs its check this season. */
  dueThisSeason: boolean;
}

export function adoptionStreak(checks: StoredCheck[], siteCode: string | null | undefined, now: Date): Streak {
  const current = seasonOrdinal(now);
  const done = new Set(
    siteCode
      ? checks.filter((c) => c.siteCode === siteCode && isAccepted(c)).map((c) => seasonOrdinal(new Date(c.submittedAt)))
      : [],
  );
  let s = done.has(current) ? current : current - 1;
  let count = 0;
  while (done.has(s)) { count++; s--; }
  return {
    count,
    recent: [current - 3, current - 2, current - 1, current].map((o) => ({ ordinal: o, done: done.has(o) })),
    dueThisSeason: !!siteCode && !done.has(current),
  };
}

/** A check in progress, saved as the volunteer answers so it survives the app closing. */
export interface Draft {
  siteCode: string;
  answers: import("./checkForm").Answers;
  stepIdx: number;
  startedAt: string;
  savedAt: string;
}

const KEY_DRAFT = "sk.draft.v1";
const DRAFT_MAX_AGE_H = 12;

export function loadDraft(now = new Date()): Draft | null {
  const d = read<Draft | null>(KEY_DRAFT, null);
  if (!d) return null;
  return now.getTime() - Date.parse(d.savedAt) < DRAFT_MAX_AGE_H * 3600_000 ? d : null;
}

export function saveDraft(d: Draft) {
  write(KEY_DRAFT, d);
}

export function clearDraft() {
  try { localStorage.removeItem(KEY_DRAFT); } catch { /* ignore */ }
}
