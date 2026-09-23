// Maps a StreamKeepers check to a FHIR R4 transaction Bundle shaped by the
// OneAquaHealth FHIR IG (hl7-eu/oah, canonical http://hl7.eu/fhir/ig/oah).
//
// Design:
// - Every check becomes a QuestionnaireResponse (the volunteer's answers,
//   official OAH app codes) about a Location (profile location-oah).
// - Only checks that PASSED the quality gate also become OAH indicator
//   Observations (profile observation-indicators-oah). That profile fixes
//   status = final, so unreviewed citizen data stays a QuestionnaireResponse
//   until a reviewer confirms it.
// - Practice checks carry the standard HTEST security label (test data).
// - Location, Practitioner and Questionnaire use conditional create, so
//   repeated checks don't duplicate them.
import { STEPS, UNSURE, type Answers, type Question } from "../domain/checkForm";
import type { SiteFacts } from "../domain/siteFacts";
import type { StoredCheck } from "../domain/store";

export const OAH = "http://hl7.eu/fhir/ig/oah";
export const OAH_CS = `${OAH}/CodeSystem/temporarySystem-oah-eu`;
export const PROFILE_OBS = `${OAH}/StructureDefinition/observation-indicators-oah`;
export const PROFILE_LOC = `${OAH}/StructureDefinition/location-oah`;

export const SK = "https://github.com/BriceZemba/streamkeepers/fhir";
export const SK_CS = `${SK}/CodeSystem/streamkeepers`;
export const SK_QUESTIONNAIRE = `${SK}/Questionnaire/stream-check`;
export const SK_QUESTIONNAIRE_VERSION = "0.2.0";
export const SK_TAG = { system: SK_CS, code: "streamkeepers", display: "Created by StreamKeepers" };
export const EXT_MISSION_POINTS = `${SK}/StructureDefinition/mission-points`;
export const EXT_CREDITED_POINTS = `${SK}/StructureDefinition/credited-points`;
export const EXT_GATE = `${SK}/StructureDefinition/quality-gate`;
export const SITE_ID_SYSTEM = "https://api.enora-oah.eu/api/sites";
export const KEEPER_ID_SYSTEM = `${SK}/keeper`;
const HTEST = { system: "http://terminology.hl7.org/CodeSystem/v3-ActReason", code: "HTEST", display: "test health data" };
/** Explicit answers, so "nothing seen" and "not sure" are coded data, not missing answers. */
export const NONE_OF_THESE = { system: SK_CS, code: "none-of-these", display: "None of these" };
export const NOT_SURE = { system: SK_CS, code: "not-sure", display: "Not sure" };

/** Official OAH Citizen Science App vocabulary for a question, as a code system URI. */
const OFFICIAL_VOCAB: Record<string, string> = {
  water_flow: "water_flows", water_color: "water_colors", channel_type: "channel_types", channel_form: "channel_forms",
  bank_type: "bank_types", habitats: "habitats", fallen_biomass: "fallen_biomass", vegetation_left: "vegetation_types",
  vegetation_right: "vegetation_types", overall: "stream_assessments",
};
export const answerSystem = (qid: string) =>
  OFFICIAL_VOCAB[qid] ? `https://api.enora-oah.eu/api/citizens/${OFFICIAL_VOCAB[qid]}` : `${SK_CS}-${qid.replace(/_/g, "-")}`;

type Json = Record<string, unknown>;
export interface BundleEntry { fullUrl: string; resource: Json; request: { method: "POST"; url: string; ifNoneExist?: string } }
export interface TransactionBundle { resourceType: "Bundle"; type: "transaction"; entry: BundleEntry[] }

const QUESTIONS: Question[] = STEPS.flatMap((s) => s.questions);
const question = (id: string) => QUESTIONS.find((q) => q.id === id)!;

function coding(qid: string, code: string): Json {
  const opt = question(qid).options.find((o) => o.code === code);
  return { system: answerSystem(qid), code, display: opt?.official ?? opt?.label ?? code };
}

/** Answer codes, without "not sure". */
function codes(a: Answers, qid: string): string[] {
  const v = a[qid];
  const list = Array.isArray(v) ? v : typeof v === "string" ? [v] : [];
  return list.filter((c) => c !== UNSURE);
}

/** Minimal generated narrative (FHIR dom-6 best practice): a one-line human summary. */
export const narrative = (summary: string): Json => ({
  status: "generated",
  div: `<div xmlns="http://www.w3.org/1999/xhtml"><p>${summary.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p></div>`,
});

/** Group linkIds are prefixed so they can never clash with a question's linkId (FHIR que-2). */
export const groupLinkId = (stepId: string) => `step-${stepId}`;

const meta = (practice: boolean, profile?: string): Json => ({
  ...(profile ? { profile: [profile] } : {}),
  tag: [SK_TAG],
  ...(practice ? { security: [HTEST] } : {}),
});

export function questionnaire(): Json {
  return {
    resourceType: "Questionnaire",
    url: SK_QUESTIONNAIRE,
    version: SK_QUESTIONNAIRE_VERSION,
    name: "StreamKeepersStreamCheck",
    title: "StreamKeepers stream check (OneAquaHealth citizen protocol, plain language)",
    status: "draft",
    experimental: true,
    publisher: "StreamKeepers (OneAquaHealth IEEE Hackathon 2026 prototype)",
    meta: { tag: [SK_TAG] },
    text: narrative("StreamKeepers stream check: the OneAquaHealth citizen stream assessment in plain language, with the official answer codes."),
    item: STEPS.map((s) => ({
      linkId: groupLinkId(s.id),
      text: s.title,
      type: "group",
      item: s.questions.map((q) => ({
        linkId: q.id,
        text: q.title,
        prefix: q.term,
        type: "choice",
        repeats: q.kind === "multi",
        required: true,
        answerOption: [
          ...q.options.map((o) => ({ valueCoding: coding(q.id, o.code) })),
          ...(q.kind === "multi" ? [{ valueCoding: NONE_OF_THESE }] : []),
          ...(q.allowUnsure ? [{ valueCoding: NOT_SURE }] : []),
        ],
      })),
    })),
  };
}

export function location(site: SiteFacts): Json {
  return {
    resourceType: "Location",
    meta: { profile: [PROFILE_LOC], tag: [SK_TAG] },
    text: narrative(`${site.name} (${site.kind === "research" ? `OneAquaHealth research site ${site.code}, ${site.cityName}` : "citizen-created site"})`),
    identifier: [{ system: SITE_ID_SYSTEM, value: site.code }],
    name: site.name,
    mode: "instance",
    status: "active",
    description: site.kind === "research" ? `OneAquaHealth research site ${site.code}, ${site.cityName}` : "Citizen-created stream site (OneAquaHealth app)",
    position: { latitude: site.lat, longitude: site.lon },
  };
}

export function practitioner(keeperId: string): Json {
  // Pseudonymous: no name, no contact details.
  return {
    resourceType: "Practitioner",
    meta: { tag: [SK_TAG] },
    text: narrative("Pseudonymous StreamKeepers volunteer (no name or contact details)."),
    identifier: [{ system: KEEPER_ID_SYSTEM, value: keeperId }],
    active: true,
  };
}

function gateExtension(check: StoredCheck): Json {
  return {
    url: EXT_GATE,
    extension: [
      { url: "outcome", valueCode: check.gate.outcome.toLowerCase() },
      ...check.gate.results.map((r) => ({ url: "rule", valueString: `${r.rule}: ${r.passed ? "pass" : "hold"} (${r.message})` })),
    ],
  };
}

export function questionnaireResponse(check: StoredCheck, locRef: string, keeperRef: string): Json {
  return {
    resourceType: "QuestionnaireResponse",
    meta: meta(check.practice),
    text: narrative(`Citizen stream check (${check.gate.outcome === "ACCEPTED" ? "passed the quality gate" : "held for review"}), ${check.submittedAt.slice(0, 10)}.`),
    identifier: { system: `${SK}/check`, value: check.id },
    questionnaire: `${SK_QUESTIONNAIRE}|${SK_QUESTIONNAIRE_VERSION}`,
    status: "completed",
    subject: { reference: locRef },
    authored: check.submittedAt,
    author: { reference: keeperRef },
    extension: [
      { url: EXT_MISSION_POINTS, valueInteger: check.missionPoints },
      { url: EXT_CREDITED_POINTS, valueInteger: check.creditedPoints },
      gateExtension(check),
    ],
    item: STEPS.filter((s) => s.questions.some((q) => check.answers[q.id] !== undefined)).map((s) => ({
      linkId: groupLinkId(s.id),
      item: s.questions
        .filter((q) => check.answers[q.id] !== undefined)
        .map((q) => {
          const v = check.answers[q.id];
          const list = Array.isArray(v) ? v : [v as string];
          return {
            linkId: q.id,
            text: q.title,
            answer: list.length
              ? list.map((c) => ({ valueCoding: c === UNSURE ? NOT_SURE : coding(q.id, c) }))
              : [{ valueCoding: NONE_OF_THESE }], // empty multi-select = "none of these"
          };
        }),
    })),
  };
}

const oahCode = (code: string, display: string) => ({ coding: [{ system: OAH_CS, code, display }] });
const skCode = (code: string, display: string) => ({ coding: [{ system: SK_CS, code, display }] });
const present = (yes: boolean) => ({ coding: [{ system: OAH_CS, code: yes ? "present" : "absent", display: yes ? "Present" : "Absent" }] });

interface IndicatorDraft { code: Json; components: Json[]; value?: Json }

/** Gate-passed answers -> OAH indicator Observations (only the indicators the check actually informs). */
export function indicatorDrafts(a: Answers): IndicatorDraft[] {
  const out: IndicatorDraft[] = [];
  const comp = (code: Json, qid: string) => codes(a, qid).map((c) => ({ code, valueCodeableConcept: { coding: [coding(qid, c)] } }));

  const morph = [
    ...comp(skCode("channel-type", "Channel type"), "channel_type"),
    ...comp(skCode("channel-form", "Channel form"), "channel_form"),
    ...comp(skCode("bank-type", "Bank type"), "bank_type"),
    ...comp(skCode("habitat", "Habitat present"), "habitats"),
    ...comp(skCode("natural-debris", "Natural debris present"), "fallen_biomass"),
  ];
  if (morph.length) out.push({ code: oahCode("morophology", "Morphology of the streams"), components: morph });

  const hydro = comp(skCode("water-flow", "Water flow"), "water_flow");
  if (hydro.length) out.push({ code: oahCode("hydrology", "Hydrology of the stream"), components: hydro });

  const aspect = comp(skCode("water-aspect", "Water aspect"), "water_color");
  const sewage = codes(a, "sewage_signs");
  if (sewage.length) aspect.push({ code: skCode("sewage-signs", "Signs of sewage (smell, grey water, paper)"), valueCodeableConcept: present(sewage[0] === "YES") });
  if (aspect.length) out.push({ code: oahCode("foam", "Foam/colour/smell"), components: aspect });

  const veg: Json[] = [];
  for (const side of ["left", "right"] as const) {
    const got = codes(a, `vegetation_${side}`);
    if (a[`vegetation_${side}`] === undefined || (Array.isArray(a[`vegetation_${side}`]) && (a[`vegetation_${side}`] as string[]).includes(UNSURE))) continue;
    for (const [c, oah, d] of [["T", "trees", "Trees (height >3m)"], ["B", "bushes", "Bushes (height (1.5-3m)"], ["H", "herbaceous", "Herbaceous (height < 1.5m)"]] as const) {
      veg.push({ code: { coding: [{ system: OAH_CS, code: oah, display: d }], text: `${d}, ${side} bank` }, valueCodeableConcept: present(got.includes(c)) });
    }
  }
  if (veg.length) out.push({ code: oahCode("riparianVegetation", "Riparian vegetation"), components: veg });

  const land = [
    ...comp(skCode("impervious-margins", "Paved or built-up margins"), "impervious"),
    ...codes(a, "draining_pipes").map((c) => ({ code: skCode("draining-pipes", "Draining pipes"), valueCodeableConcept: { coding: [coding("draining_pipes", c)] } })),
    ...codes(a, "construction").map((c) => ({ code: skCode("construction", "Construction in or near the stream"), valueCodeableConcept: present(c === "YES") })),
    ...codes(a, "barriers").map((c) => ({ code: skCode("barriers", "Barriers to flow"), valueCodeableConcept: present(c === "YES") })),
  ];
  if (land.length) out.push({ code: oahCode("LandUse", "Land use in the margins"), components: land });

  const inv = codes(a, "invasive_species");
  if (inv.length) out.push({ code: oahCode("invasiveOrganisms", "Invasive invertebrate, plants and fish"), components: [], value: present(inv[0] === "YES") });

  const overall = codes(a, "overall");
  if (overall.length) out.push({ code: skCode("citizen-overall-assessment", "Citizen overall stream assessment"), components: [], value: { coding: [coding("overall", overall[0])] } });

  return out;
}

export function observations(check: StoredCheck, locRef: string, keeperRef: string, qrRef: string): Json[] {
  return indicatorDrafts(check.answers).map((d) => ({
    resourceType: "Observation",
    meta: meta(check.practice, PROFILE_OBS),
    text: narrative(`${((d.code as { coding: { display: string }[] }).coding[0].display)} observed by a citizen volunteer, ${check.submittedAt.slice(0, 10)}.`),
    status: "final",
    category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "survey", display: "Survey" }] }],
    code: d.code,
    subject: { reference: locRef },
    effectiveDateTime: check.submittedAt,
    performer: [{ reference: keeperRef }],
    derivedFrom: [{ reference: qrRef }],
    ...(d.value ? { valueCodeableConcept: d.value } : {}),
    ...(d.components.length ? { component: d.components } : {}),
  }));
}

export function checkBundle(check: StoredCheck, site: SiteFacts): TransactionBundle {
  const uuid = () => `urn:uuid:${crypto.randomUUID()}`;
  const loc = uuid(), keeper = uuid(), qr = uuid(), q = uuid();
  const entry: BundleEntry[] = [
    { fullUrl: q, resource: questionnaire(), request: { method: "POST", url: "Questionnaire", ifNoneExist: `url=${SK_QUESTIONNAIRE}&version=${SK_QUESTIONNAIRE_VERSION}` } },
    { fullUrl: loc, resource: location(site), request: { method: "POST", url: "Location", ifNoneExist: `identifier=${SITE_ID_SYSTEM}|${site.code}` } },
    { fullUrl: keeper, resource: practitioner(check.keeperId), request: { method: "POST", url: "Practitioner", ifNoneExist: `identifier=${KEEPER_ID_SYSTEM}|${check.keeperId}` } },
    { fullUrl: qr, resource: questionnaireResponse(check, loc, keeper), request: { method: "POST", url: "QuestionnaireResponse", ifNoneExist: `identifier=${SK}/check|${check.id}` } },
  ];
  if (check.gate.outcome === "ACCEPTED") {
    for (const o of observations(check, loc, keeper, qr)) entry.push({ fullUrl: uuid(), resource: o, request: { method: "POST", url: "Observation" } });
  }
  return { resourceType: "Bundle", type: "transaction", entry };
}
