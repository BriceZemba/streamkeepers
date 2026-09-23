// Writes a check to a FHIR R4 server, then verifies it with an independent
// read: separate GETs of each stored resource, compared against what we meant
// to write. "Saved" in the UI means "read back and matched", not "POST returned 200".
import { PROFILE_OBS, SK_TAG, type TransactionBundle } from "./mapping";

export const FHIR_SERVERS = {
  oah: { label: "OneAquaHealth FHIR sandbox (HL7 Europe)", base: "https://sandbox.hl7europe.eu/oneaquahealth/fhir" },
  hapi: { label: "Public HAPI R4 test server (fallback)", base: "https://hapi.fhir.org/baseR4" },
} as const;
export type ServerKey = keyof typeof FHIR_SERVERS;

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export interface SyncResult {
  server: string;
  ok: boolean;
  /** Resource references the server assigned, e.g. "QuestionnaireResponse/123". */
  refs: string[];
  /** What the independent read-back found. */
  verified: { ref: string; ok: boolean; note: string }[];
  error?: string;
  at: string;
}

const HEADERS = { "Content-Type": "application/fhir+json", Accept: "application/fhir+json" };

async function get(base: string, ref: string): Promise<Json> {
  const res = await fetch(`${base}/${ref}`, { headers: { Accept: "application/fhir+json" }, cache: "no-store" });
  if (!res.ok) throw new Error(`GET ${ref} -> HTTP ${res.status}`);
  return res.json();
}

/** Strip "/_history/n" from a transaction response location. */
export const refFromLocation = (loc: string) => loc.replace(/^https?:\/\/[^/]+\/.*?\/(?=[A-Z][A-Za-z]+\/)/, "").replace(/\/_history\/.*$/, "");

export function checkStored(sent: Json, stored: Json): string[] {
  const problems: string[] = [];
  if (stored.resourceType !== sent.resourceType) problems.push(`type ${stored.resourceType} ≠ ${sent.resourceType}`);
  const tags: Json[] = stored.meta?.tag ?? [];
  if (!tags.some((t) => t.system === SK_TAG.system && t.code === SK_TAG.code)) problems.push("StreamKeepers tag missing");
  if (sent.resourceType === "QuestionnaireResponse") {
    const flat = (r: Json) =>
      (r.item ?? []).flatMap((g: Json) => (g.item ?? []).map((i: Json) => `${i.linkId}=${(i.answer ?? []).map((a: Json) => a.valueCoding?.code ?? a.valueString).join("+")}`)).sort().join(";");
    if (flat(sent) !== flat(stored)) problems.push("answers differ from what was sent");
    if (stored.authored?.slice(0, 19) !== sent.authored?.slice(0, 19)) problems.push("authored time differs");
  }
  if (sent.resourceType === "Observation") {
    if (stored.status !== "final") problems.push(`status ${stored.status}`);
    if (!(stored.meta?.profile ?? []).includes(PROFILE_OBS)) problems.push("OAH profile not declared");
    if (!stored.subject?.reference?.startsWith("Location/")) problems.push("subject is not a Location");
    if (!stored.performer?.length) problems.push("performer missing");
    if (JSON.stringify(stored.code?.coding?.[0]?.code) !== JSON.stringify(sent.code?.coding?.[0]?.code)) problems.push("code differs");
  }
  return problems;
}

export async function syncCheck(base: string, bundle: TransactionBundle): Promise<SyncResult> {
  const at = new Date().toISOString();
  try {
    const res = await fetch(base, { method: "POST", headers: HEADERS, body: JSON.stringify(bundle) });
    const body = (await res.json().catch(() => ({}))) as Json;
    if (!res.ok) {
      const diag = body.issue?.map((i: Json) => i.diagnostics).filter(Boolean).join("; ");
      return { server: base, ok: false, refs: [], verified: [], error: `HTTP ${res.status}${diag ? `: ${diag}` : ""}`, at };
    }
    const refs: string[] = (body.entry ?? []).map((e: Json) => refFromLocation(e.response?.location ?? ""));
    // Verify every resource we created or matched, through separate GETs.
    const verified = await Promise.all(
      refs.map(async (ref, i) => {
        try {
          const stored = await get(base, ref);
          const problems = checkStored(bundle.entry[i].resource, stored);
          return { ref, ok: problems.length === 0, note: problems.length ? problems.join(", ") : "read back and matched" };
        } catch (e) {
          return { ref, ok: false, note: (e as Error).message };
        }
      }),
    );
    return { server: base, ok: verified.every((v) => v.ok), refs, verified, at };
  } catch (e) {
    return { server: base, ok: false, refs: [], verified: [], error: `Could not reach ${new URL(base).host} (${(e as Error).message})`, at };
  }
}
