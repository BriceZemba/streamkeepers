// Quality gate: decides whether a check earns its points now or waits for a
// human reviewer. It never deletes a check and never looks at *what* was
// reported (clean or polluted), only at whether the report is internally
// consistent, careful and made at the site.
import { UNSURE, activeSteps, isAnswered, type Answers } from "./checkForm";
import type { Msg } from "./missionValue";

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
  /** Plain-language English message (also written to FHIR). */
  message: string;
  /** Translatable form of the message(s). */
  msgs: Msg[];
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

export interface Contradiction extends Msg {
  text: string;
}

/** Contradictions between answers. Deliberately symmetric: a "poor" rating that
 * conflicts with the evidence is questioned exactly like a "good" one. */
export function contradictions(a: Answers): Contradiction[] {
  const out: Contradiction[] = [];
  const pollutionSeen =
    has(a, "sewage_signs", "YES") || has(a, "water_color", "FO") || has(a, "water_color", "CO") || has(a, "draining_pipes", "FLOWING");
  if (a.overall === "GOOD" && pollutionSeen) {
    out.push({ key: "gate.c.goodPolluted", text: "You rated the stream Good but reported signs of pollution (sewage, foam, unusual colour or a flowing pipe)." });
  }
  const allNatural =
    has(a, "channel_type", "NAT") && has(a, "bank_type", "NAT") && has(a, "sewage_signs", "NO") &&
    has(a, "draining_pipes", "NO") && has(a, "construction", "NO") && has(a, "invasive_species", "NO") &&
    has(a, "impervious", "NONE") && (a.water_flow === "DRY" || (Array.isArray(a.water_color) && a.water_color.length === 1 && a.water_color[0] === "CL"));
  if (a.overall === "POOR" && allNatural) {
    out.push({ key: "gate.c.poorNatural", text: "You rated the stream Poor but everything you reported is natural and the water is clear." });
  }
  if (has(a, "water_color", "CL") && (has(a, "water_color", "MU") || has(a, "water_color", "CO"))) {
    out.push({ key: "gate.c.clearMuddy", text: "The water can't be both clear and muddy or discoloured." });
  }
  const multi = (id: string) => (Array.isArray(a[id]) ? (a[id] as string[]) : []);
  if (["water_color", "habitats", "fallen_biomass", "vegetation_left", "vegetation_right"].some((id) => multi(id).includes(UNSURE) && multi(id).length > 1)) {
    out.push({ key: "gate.c.unsureAndOption", text: "An answer is marked both 'not sure' and a specific option." });
  }
  if (a.water_flow === "DRY" && (has(a, "habitats", "AV") || has(a, "habitats", "RF"))) {
    out.push({ key: "gate.c.dryWater", text: "The bed is dry, but you reported plants in the water or ripples." });
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
  if (missing.length > 0) {
    results.push({ rule: "complete", passed: false, message: `${missing.length} question(s) not answered.`, msgs: [{ key: "gate.complete.missing", params: { n: missing.length } }] });
  } else if (unsureShare > cfg.maxUnsureShare) {
    results.push({
      rule: "complete", passed: false,
      message: `${unsure.length} of ${questions.length} answers are "not sure". That's fine, but a reviewer will take a look.`,
      msgs: [{ key: "gate.complete.unsure", params: { n: unsure.length, total: questions.length } }],
    });
  } else {
    results.push({ rule: "complete", passed: true, message: "All questions answered.", msgs: [{ key: "gate.complete.ok" }] });
  }

  const seconds = Math.round((Date.parse(sub.submittedAt) - Date.parse(sub.startedAt)) / 1000);
  results.push(
    seconds >= cfg.minSeconds
      ? { rule: "careful", passed: true, message: `Took ${seconds} s.`, msgs: [{ key: "gate.careful.ok", params: { s: seconds } }] }
      : {
          rule: "careful", passed: false,
          message: `Finished in ${seconds} s. A careful look usually takes at least ${cfg.minSeconds} s.`,
          msgs: [{ key: "gate.careful.fast", params: { s: seconds, min: cfg.minSeconds } }],
        },
  );

  if (sub.practice) {
    results.push({ rule: "at_site", passed: true, message: "Practice mode: location not checked.", msgs: [{ key: "gate.atSite.practice" }] });
  } else if (sub.distanceM === null) {
    results.push({ rule: "at_site", passed: false, message: "No GPS position, so we can't confirm you were at the stream.", msgs: [{ key: "gate.atSite.noGps" }] });
  } else if (sub.distanceM <= cfg.maxDistanceM) {
    const m = Math.round(sub.distanceM);
    results.push({ rule: "at_site", passed: true, message: `At the site (${m} m away).`, msgs: [{ key: "gate.atSite.ok", params: { m } }] });
  } else {
    const km = (sub.distanceM / 1000).toFixed(1);
    results.push({ rule: "at_site", passed: false, message: `You were ${km} km from the site.`, msgs: [{ key: "gate.atSite.far", params: { km } }] });
  }

  const c = contradictions(sub.answers);
  results.push(
    c.length
      ? { rule: "consistent", passed: false, message: c.map((x) => x.text).join(" "), msgs: c.map(({ key, params }) => ({ key, params })) }
      : { rule: "consistent", passed: true, message: "Answers are consistent.", msgs: [{ key: "gate.consistent.ok" }] },
  );

  const windowMs = cfg.duplicateWindowH * 3600_000;
  const dup = previous.some(
    (p) => p.keeperId === sub.keeperId && p.siteCode === sub.siteCode && Math.abs(Date.parse(sub.submittedAt) - Date.parse(p.submittedAt)) < windowMs,
  );
  results.push({
    rule: "not_duplicate",
    passed: true, // a repeat visit is still useful data, it just doesn't earn points twice
    message: dup ? `You already checked this site in the last ${cfg.duplicateWindowH} h. Saved, but no new points.` : "First check here today.",
    msgs: [dup ? { key: "gate.dup.yes", params: { h: cfg.duplicateWindowH } } : { key: "gate.dup.no" }],
  });

  const outcome: Outcome = results.every((r) => r.passed) ? "ACCEPTED" : "REVIEW";
  return { outcome, results, noNewPoints: dup };
}
