// The guided stream check. Answer codes are the official OneAquaHealth Citizen
// Science App vocabularies (snapshotted from api.enora-oah.eu), so a StreamKeepers
// check can be stored next to checks made in the official app. Wording is
// simplified; the official term is shown under each question.
import channelForms from "../data/oah/channelForms.json";
import channelTypes from "../data/oah/channelTypes.json";
import bankTypes from "../data/oah/bankTypes.json";
import habitats from "../data/oah/habitats.json";
import fallenBiomass from "../data/oah/fallenBiomass.json";
import waterFlows from "../data/oah/waterFlows.json";
import waterColors from "../data/oah/waterColors.json";
import vegetationTypes from "../data/oah/vegetationTypes.json";
import streamAssessments from "../data/oah/streamAssessments.json";

export const UNSURE = "UNSURE";

export interface Option {
  code: string;
  label: string;
  hint?: string;
  /** Official OAH label, shown small, when it differs from our plain wording. */
  official?: string;
}

export interface Question {
  id: string;
  kind: "single" | "multi";
  title: string;
  help: string;
  /** Scientific / official term shown under the plain-language title. */
  term: string;
  options: Option[];
  /** "official" = OAH app vocabulary; "extension" = StreamKeepers addition, documented as such. */
  source: "official" | "extension";
  allowUnsure: boolean;
}

export interface Step {
  id: string;
  title: string;
  questions: Question[];
  /** Skip the step when this returns true (e.g. no water colour for a dry bed). */
  skipIf?: (a: Answers) => boolean;
}

export type Answers = Record<string, string | string[] | undefined>;

type Vocab = { code: string; name: string; description?: string }[];

/** "Natural (Α)" -> "Natural": drop the protocol letter the official app appends. */
const clean = (name: string) => name.replace(/\s*\([A-Za-zΑΒ]\)\s*$/u, "").trim();

const fromVocab = (v: Vocab, plain: Record<string, { label: string; hint?: string }>): Option[] =>
  v.map((o) => {
    const p = plain[o.code];
    const official = clean(o.name);
    return { code: o.code, label: p?.label ?? official, hint: p?.hint, official: p && p.label !== official ? official : undefined };
  });

const YES_NO: Option[] = [
  { code: "YES", label: "Yes" },
  { code: "NO", label: "No" },
];

export const STEPS: Step[] = [
  {
    id: "water",
    title: "The water",
    questions: [
      {
        id: "water_flow", kind: "single", source: "official", allowUnsure: false,
        title: "How is the water moving?", term: "Water flow", help: "Watch a leaf or a bit of foam for a few seconds.",
        options: fromVocab(waterFlows as Vocab, {
          FAS: { label: "Fast", hint: "Waves, or a leaf is carried away quickly" },
          NOR: { label: "Slow", hint: "Moving, but gently" },
          STA: { label: "Still or in puddles", hint: "Barely moving, or only pools" },
          DRY: { label: "Dry", hint: "No water in the bed" },
        }),
      },
    ],
  },
  {
    id: "colour",
    title: "What the water looks like",
    skipIf: (a) => a.water_flow === "DRY",
    questions: [
      {
        id: "water_color", kind: "multi", source: "official", allowUnsure: true,
        title: "What does the water look like?", term: "Water aspect", help: "Pick everything you see.",
        options: fromVocab(waterColors as Vocab, {
          CL: { label: "Clear", hint: "You can see the bottom" },
          MU: { label: "Muddy or cloudy" },
          FO: { label: "Foam on the surface" },
          CO: { label: "Unusual colour", hint: "Grey, white, green, oily sheen…" },
        }),
      },
    ],
  },
  {
    id: "channel",
    title: "The stream bed",
    questions: [
      {
        id: "channel_type", kind: "single", source: "official", allowUnsure: true,
        title: "What is the stream bed made of?", term: "Channel type", help: "Look at the bottom and the lower sides.",
        options: fromVocab(channelTypes as Vocab, {
          NAT: { label: "Natural", hint: "Earth, sand, stones, plants" },
          ART: { label: "Built", hint: "Concrete, or stones set in concrete" },
        }),
      },
      {
        id: "channel_form", kind: "single", source: "official", allowUnsure: true,
        title: "What shape is the stream bed?", term: "Channel form", help: "Imagine cutting the stream across.",
        options: fromVocab(channelForms as Vocab, {
          FLAT: { label: "Wide and flat" },
          U: { label: "U-shaped", hint: "Rounded bottom" },
          V: { label: "V-shaped", hint: "Steep sides, narrow bottom" },
        }),
      },
      {
        id: "bank_type", kind: "single", source: "official", allowUnsure: true,
        title: "What are the banks made of?", term: "Bank type", help: "The sides that hold the water in.",
        options: fromVocab(bankTypes as Vocab, {
          NAT: { label: "Natural", hint: "Soil, roots, plants" },
          ART: { label: "Built with concrete" },
          LAS: { label: "Stacked stones, no concrete" },
        }),
      },
    ],
  },
  {
    id: "life",
    title: "Places for life",
    questions: [
      {
        id: "habitats", kind: "multi", source: "official", allowUnsure: true,
        title: "Which of these can you see in the water?", term: "Habitats", help: "Pick all that apply, or none.",
        options: fromVocab(habitats as Vocab, {
          SB: { label: "Sand along the edge" },
          SI: { label: "Sand islands" },
          SD: { label: "Piles of stones" },
          RF: { label: "Small waterfalls or ripples" },
          AV: { label: "Plants growing in the water" },
        }),
      },
      {
        id: "fallen_biomass", kind: "multi", source: "official", allowUnsure: true,
        title: "Is there wood or leaves in the stream?", term: "Natural debris (fallen biomass)", help: "Pick all that apply, or none.",
        options: fromVocab(fallenBiomass as Vocab, {
          FT: { label: "Fallen trees" },
          FB: { label: "Branches" },
          FL: { label: "Piles of leaves" },
        }),
      },
    ],
  },
  {
    id: "pressures",
    title: "Signs of pressure",
    questions: [
      {
        id: "draining_pipes", kind: "single", source: "official", allowUnsure: true,
        title: "Do pipes flow into the stream?", term: "Draining pipes", help: "Pipes or drains opening onto the stream.",
        options: [
          { code: "NO", label: "No pipes" },
          { code: "DRY_PIPE", label: "Pipes, but nothing coming out" },
          { code: "FLOWING", label: "Pipes with water coming out" },
        ],
      },
      {
        id: "sewage_signs", kind: "single", source: "extension", allowUnsure: true,
        title: "Any sewage smell, grey water or toilet paper?", term: "Signs of sewage (StreamKeepers addition)", help: "Report it even if you are not sure where it comes from.",
        options: YES_NO,
      },
      {
        id: "barriers", kind: "single", source: "official", allowUnsure: true,
        title: "Is something blocking the flow?", term: "Barriers", help: "Weirs, small dams, culverts, big rubbish.",
        options: YES_NO,
      },
      {
        id: "construction", kind: "single", source: "official", allowUnsure: true,
        title: "Are there works in or next to the stream?", term: "Construction", help: "Digging, machines, new walls.",
        options: YES_NO,
      },
      {
        id: "invasive_species", kind: "single", source: "official", allowUnsure: true,
        title: "Did you see plants or animals that don't belong here?", term: "Invasive species", help: "For example giant knotweed, water hyacinth, red swamp crayfish.",
        options: YES_NO,
      },
    ],
  },
  {
    id: "banks",
    title: "The banks",
    questions: [
      {
        id: "vegetation_left", kind: "multi", source: "official", allowUnsure: true,
        title: "Plants on the left bank (looking downstream)", term: "Vegetation, left margin", help: "Pick all that apply, or none.",
        options: fromVocab(vegetationTypes as Vocab, { H: { label: "Grass and herbs" }, B: { label: "Bushes" }, T: { label: "Trees" } }),
      },
      {
        id: "vegetation_right", kind: "multi", source: "official", allowUnsure: true,
        title: "Plants on the right bank", term: "Vegetation, right margin", help: "Pick all that apply, or none.",
        options: fromVocab(vegetationTypes as Vocab, { H: { label: "Grass and herbs" }, B: { label: "Bushes" }, T: { label: "Trees" } }),
      },
      {
        id: "impervious", kind: "single", source: "official", allowUnsure: true,
        title: "How much of the banks is paved or built on?", term: "Impervious areas", help: "Roads, car parks, buildings within about 10 m of the water.",
        options: [
          { code: "NONE", label: "None" },
          { code: "SOME", label: "Some", hint: "Less than half" },
          { code: "MOST", label: "Most", hint: "More than half" },
        ],
      },
    ],
  },
  {
    id: "overall",
    title: "Your overall view",
    questions: [
      {
        id: "overall", kind: "single", source: "official", allowUnsure: false,
        title: "Overall, how healthy does this stream look?", term: "Overall stream assessment", help: "Your honest view. Every answer earns the same points.",
        options: fromVocab(streamAssessments as Vocab, {
          GOOD: { label: "Good", hint: "Natural bed, plants on the banks, water looks clean, signs of life" },
          MODERATE: { label: "Moderate", hint: "Some changes by people, but still plants and life" },
          POOR: { label: "Poor", hint: "Heavily built up, few plants, signs of pollution" },
        }),
      },
    ],
  },
];

export const ALL_QUESTIONS: Question[] = STEPS.flatMap((s) => s.questions);

export function activeSteps(a: Answers): Step[] {
  return STEPS.filter((s) => !s.skipIf?.(a));
}

export function isAnswered(q: Question, a: Answers): boolean {
  const v = a[q.id];
  // An empty multi-select is a valid answer ("none of these").
  return q.kind === "multi" ? Array.isArray(v) : typeof v === "string" && v.length > 0;
}
