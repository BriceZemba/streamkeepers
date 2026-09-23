// FHIR for a reviewer's decision on a held check.
// - Accepted: the OAH indicator Observations (status final) are created now,
//   derivedFrom the QuestionnaireResponse already on the server, plus a
//   Provenance naming the reviewer as verifier.
// - Rejected: only a Provenance with the reason. The QuestionnaireResponse stays.
// If the check never reached the server, the whole check is sent with it.
import type { SiteFacts } from "../domain/siteFacts";
import type { StoredCheck } from "../domain/store";
import { checkBundle, narrative, observations, SK_TAG, type BundleEntry, type TransactionBundle } from "./mapping";

const HTEST = { system: "http://terminology.hl7.org/CodeSystem/v3-ActReason", code: "HTEST", display: "test health data" };

function provenance(check: StoredCheck, targets: string[], qrRef: string): Record<string, unknown> {
  const r = check.review!;
  const accepted = r.decision === "accepted";
  return {
    resourceType: "Provenance",
    meta: { tag: [SK_TAG], ...(check.practice ? { security: [HTEST] } : {}) },
    text: narrative(`${accepted ? "Accepted" : "Rejected"} by ${r.reviewer} on ${r.at.slice(0, 10)}${accepted ? "" : `: ${r.reason}`}.`),
    target: targets.map((reference) => ({ reference })),
    recorded: r.at,
    activity: accepted
      ? { coding: [{ system: "http://terminology.hl7.org/CodeSystem/v3-DataOperation", code: "CREATE", display: "create" }], text: "Reviewer accepted a citizen check held by the quality gate" }
      : { text: "Reviewer rejected a citizen check held by the quality gate" },
    // Purpose of the review: public health (v3-PurposeOfUse), with the decision in text.
    reason: [{
      coding: [{ system: "http://terminology.hl7.org/CodeSystem/v3-ActReason", code: "PUBHLTH", display: "public health" }],
      text: accepted ? "Confirmed by reviewer" : `Rejected: ${r.reason}${r.note ? ` (${r.note})` : ""}`,
    }],
    agent: [
      {
        type: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/provenance-participant-type", code: "verifier", display: "Verifier" }] },
        who: { display: r.reviewer },
      },
    ],
    entity: [{ role: "source", what: { reference: qrRef } }],
  };
}

/** Server references from the check's earlier sync, if it reached the server. */
export function storedRefs(check: StoredCheck): { qr: string; loc: string; keeper: string } | null {
  const refs = check.sync?.ok ? check.sync.refs : [];
  const find = (type: string) => refs.find((r) => r.startsWith(`${type}/`));
  const qr = find("QuestionnaireResponse"), loc = find("Location"), keeper = find("Practitioner");
  return qr && loc && keeper ? { qr, loc, keeper } : null;
}

export function reviewBundle(check: StoredCheck, site: SiteFacts): TransactionBundle {
  if (!check.review) throw new Error("No review to send");
  const accepted = check.review.decision === "accepted";
  const refs = storedRefs(check);

  if (!refs) {
    // Never synced: send the check itself (as accepted or held), with the Provenance.
    const asSent: StoredCheck = accepted ? { ...check, gate: { ...check.gate, outcome: "ACCEPTED" } } : check;
    const b = checkBundle(asSent, site);
    const qrUrl = b.entry.find((e) => e.resource.resourceType === "QuestionnaireResponse")!.fullUrl;
    const obsUrls = b.entry.filter((e) => e.resource.resourceType === "Observation").map((e) => e.fullUrl);
    b.entry.push({ fullUrl: `urn:uuid:${crypto.randomUUID()}`, resource: provenance(check, [qrUrl, ...obsUrls], qrUrl), request: { method: "POST", url: "Provenance" } });
    return b;
  }

  const entry: BundleEntry[] = [];
  if (accepted) {
    for (const o of observations(check, refs.loc, refs.keeper, refs.qr)) {
      entry.push({ fullUrl: `urn:uuid:${crypto.randomUUID()}`, resource: o, request: { method: "POST", url: "Observation" } });
    }
  }
  const targets = [refs.qr, ...entry.map((e) => e.fullUrl)];
  entry.push({ fullUrl: `urn:uuid:${crypto.randomUUID()}`, resource: provenance(check, targets, refs.qr), request: { method: "POST", url: "Provenance" } });
  return { resourceType: "Bundle", type: "transaction", entry };
}
