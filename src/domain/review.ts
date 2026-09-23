// Reviewer decisions on checks the quality gate held. A decision never deletes
// the check: it records who decided, when and why, and (if accepted) credits the
// points and lets the check become OneAquaHealth indicator data.
import type { StoredCheck } from "./store";

export type Decision = "accepted" | "rejected";
export const REJECT_REASONS = ["rushed", "wrong_place", "contradictory", "other"] as const;
export type RejectReason = (typeof REJECT_REASONS)[number];

export interface Review {
  decision: Decision;
  reason?: RejectReason;
  note?: string;
  reviewer: string;
  at: string; // ISO
}

/** Outcome that counts for points, coverage and streaks: a reviewer's decision overrides the gate. */
export function isAccepted(c: Pick<StoredCheck, "gate"> & { review?: Review }): boolean {
  return c.review ? c.review.decision === "accepted" : c.gate.outcome === "ACCEPTED";
}

export function isPending(c: Pick<StoredCheck, "gate"> & { review?: Review }): boolean {
  return c.gate.outcome === "REVIEW" && !c.review;
}

export function applyReview(check: StoredCheck, review: Review): StoredCheck {
  if (check.gate.outcome !== "REVIEW") throw new Error("Only checks held by the quality gate are reviewed");
  if (check.review) throw new Error("Check already reviewed");
  if (review.decision === "rejected" && !review.reason) throw new Error("A rejection needs a reason");
  return {
    ...check,
    review,
    creditedPoints: review.decision === "accepted" && !check.gate.noNewPoints ? check.missionPoints : 0,
  };
}
