// Quality gate: decides whether a check earns its points now or waits for a
// human reviewer. It never deletes a check and never looks at *what* was
// reported (clean or polluted), only at whether the report is internally
// consistent, careful and made at the site.
import { UNSURE, activeSteps, isAnswered, type Answers } from "./checkForm";

export interface GateConfig {
  minSeconds: number;
  maxDistanceM: number;
  maxUnsureShare: number;
  duplicateWindowH: number;
}

export const DEFAULT_GATE: GateConfig = { minSeconds: 90, maxDistanceM: 250, maxUnsureShare: 0.5, duplicateWindowH: 24 };

export interface CheckSubmission {
  siteCode: string;
  keeperId: string;
  startedAt: string; // ISO
  submittedAt: string; // ISO
  answers: Answers;
  /** Metres between the phone's position and the site; null if no GPS fix. */
  distanceM: number | null;
  /** Practice mode (training, user tests): location rule is skipped and points are marked as practice. */
  practice: boolean;
}

export type RuleId = "complete" | "careful" | "at_site" | "consistent" | "not_duplicate";

export interface RuleResult {
  rule: RuleId;
  passed: boolean;
  /** Plain-language message shown to the volunteer. */
  message: string;
}

export type Outcome = "ACCEPTED" | "REVIEW";

export interface GateResult {
  outcome: Outcome;
  results: RuleResult[];
  /** True when the check is kept as data but earns no new points (duplicate). */
  noNewPoints: boolean;
}

const has = (a: Answers, id: string, code: string) => {
  const v = a[id];
  return Array.isArray(v) ? v.includes(code) : v === code;
};

/** Contradictions between answers. Deliberately symmetric: a "poor" rating that
 * conflicts with the evidence is questioned exactly like a "good" one. */
export function contradictions(a: Answers): string[] {
  const out: string[] = [];
  const pollutionSeen =
    has(a, "sewage_signs", "YES") || has(a, "water_color", "FO") || has(a, "water_color", "CO") || has(a, "draining_pipes", "FLOWING");
  if (a.overall === "GOOD" && pollutionSeen) {
    out.push("You rated the stream Good but reported signs of pollution (sewage, foam, unusual colour or a flowing pipe).");
  }
  const allNatural =
    has(a, "channel_type", "NAT") && has(a, "bank_type", "NAT") && has(a, "sewage_signs", "NO") &&
    has(a, "draining_pipes", "NO") && has(a, "construction", "NO") && has(a, "invasive_species", "NO") &&
    has(a, "impervious", "NONE") && (a.water_flow === "DRY" || (Array.isArray(a.water_color) && a.water_color.length === 1 && a.water_color[0] === "CL"));
  if (a.overall === "POOR" && allNatural) {
    out.push("You rated the stream Poor but everything you reported is natural and the water is clear.");
  }
  if (has(a, "water_color", "CL") && (has(a, "water_color", "MU") || has(a, "water_color", "CO"))) {
    out.push("The water can't be both clear and muddy or discoloured.");
  }
  const multi = (id: string) => (Array.isArray(a[id]) ? (a[id] as string[]) : []);
  for (const id of ["water_color", "habitats", "fallen_biomass", "vegetation_left", "vegetation_right"]) {
    if (multi(id).includes(UNSURE) && multi(id).length > 1) out.push("An answer is marked both 'not sure' and a specific option.");
  }
  if (a.water_flow === "DRY" && (has(a, "habitats", "AV") || has(a, "habitats", "RF"))) {
    out.push("The bed is dry, but you reported plants in the water or ripples.");
  }
  return out;
}

export function evaluate(sub: CheckSubmission, previous: CheckSubmission[], cfg: GateConfig = DEFAULT_GATE): GateResult {
  const results: RuleResult[] = [];
  const questions = activeSteps(sub.answers).flatMap((s) => s.questions);

  const missing = questions.filter((q) => !isAnswered(q, sub.answers));
  const unsure = questions.filter((q) => {
    const v = sub.answers[q.id];
    return v === UNSURE || (Array.isArray(v) && v.length === 1 && v[0] === UNSURE);
  });
  const unsureShare = questions.length ? unsure.length / questions.length : 0;
  results.push({
    rule: "complete",
    passed: missing.length === 0 && unsureShare <= cfg.maxUnsureShare,
    message:
      missing.length > 0
        ? `${missing.length} question(s) not answered.`
        : unsureShare > cfg.maxUnsureShare
          ? `${unsure.length} of ${questions.length} answers are "not sure". That's fine, but a reviewer will take a look.`
          : "All questions answered.",
  });

  const seconds = (Date.parse(sub.submittedAt) - Date.parse(sub.startedAt)) / 1000;
  results.push({
    rule: "careful",
    passed: seconds >= cfg.minSeconds,
    message:
      seconds >= cfg.minSeconds
        ? `Took ${Math.round(seconds)} s.`
        : `Finished in ${Math.round(seconds)} s. A careful look usually takes at least ${cfg.minSeconds} s.`,
  });

  if (sub.practice) {
    results.push({ rule: "at_site", passed: true, message: "Practice mode: location not checked." });
  } else if (sub.distanceM === null) {
    results.push({ rule: "at_site", passed: false, message: "No GPS position, so we can't confirm you were at the stream." });
  } else {
    results.push({
      rule: "at_site",
      passed: sub.distanceM <= cfg.maxDistanceM,
      message:
        sub.distanceM <= cfg.maxDistanceM
          ? `At the site (${Math.round(sub.distanceM)} m away).`
          : `You were ${(sub.distanceM / 1000).toFixed(1)} km from the site.`,
    });
  }

  const c = contradictions(sub.answers);
  results.push({ rule: "consistent", passed: c.length === 0, message: c.length ? c.join(" ") : "Answers are consistent." });

  const windowMs = cfg.duplicateWindowH * 3600_000;
  const dup = previous.some(
    (p) => p.keeperId === sub.keeperId && p.siteCode === sub.siteCode && Math.abs(Date.parse(sub.submittedAt) - Date.parse(p.submittedAt)) < windowMs,
  );
  results.push({
    rule: "not_duplicate",
    passed: true, // a repeat visit is still useful data, it just doesn't earn points twice
    message: dup ? `You already checked this site in the last ${cfg.duplicateWindowH} h. Saved, but no new points.` : "First check here today.",
  });

  const outcome: Outcome = results.every((r) => r.passed) ? "ACCEPTED" : "REVIEW";
  return { outcome, results, noNewPoints: dup };
}

