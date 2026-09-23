# Validating StreamKeepers FHIR output

StreamKeepers writes every check (and every reviewer decision) as FHIR R4 resources shaped by the OneAquaHealth Implementation Guide ([`hl7-eu/oah`](https://github.com/hl7-eu/oah), canonical `http://hl7.eu/fhir/ig/oah`). This page shows how the output is checked with the **official HL7 FHIR validator**.

**Latest result:** [eval/fhir/validation-summary.md](../eval/fhir/validation-summary.md): 0 errors, 0 warnings on an accepted check, a held check and a reviewer decision.

## What is validated

| File | What it contains |
|---|---|
| `eval/fhir/accepted-check.json` | A check that passed the quality gate: Questionnaire, Location (`location-oah`), Practitioner, QuestionnaireResponse, OAH indicator Observations (`observation-indicators-oah`) |
| `eval/fhir/held-check.json` | A check held for review: no indicator Observations yet |
| `eval/fhir/reviewed-check.json` | The held check after a reviewer accepted it: Observations plus a Provenance (reviewer as `verifier`) |

They are produced by the app's own code (`npm run fhir:examples`), not written by hand.

Against:
1. FHIR R4 core (4.0.1).
2. The OneAquaHealth IG. Its build site was offline during the hackathon, so it is compiled from source with SUSHI (0 errors).
3. The StreamKeepers definitions in [`fhir/`](../fhir/): three QuestionnaireResponse extensions (mission points, credited points, quality gate) and the code systems for every answer list. The official Citizen Science App vocabularies are generated from the OneAquaHealth API snapshot (`npm run fhir:vocab`), so they cannot drift from what the app shows.
4. The StreamKeepers Questionnaire, so every answer is checked against its question.

## Reproduce

Requirements: Java 11+ and the HL7 validator (`validator_cli.jar`, from [hapifhir/org.hl7.fhir.core releases](https://github.com/hapifhir/org.hl7.fhir.core/releases/latest)).

```bash
# 1. The OneAquaHealth IG, compiled from source
git clone --depth 1 https://github.com/hl7-eu/oah.git /tmp/oah
npx fsh-sushi build /tmp/oah

# 2. StreamKeepers definitions and examples
npm run fhir:vocab
npx fsh-sushi build fhir
npm run fhir:examples

# 3. Validate (the first run downloads FHIR packages, about 15 minutes; later runs about 1 minute)
JAVA_BIN=java HL7_VALIDATOR=/path/to/validator_cli.jar OAH_IG=/tmp/oah/fsh-generated/resources npm run fhir:validate
```

## What the validator found, and what changed

The first run (before these definitions existed) reported 5 errors per file. Fixed:

- **Duplicate `linkId`** (rule `que-2`): the "overall" step and the "overall" question shared an id. Group ids are now prefixed (`step-overall`).
- **Empty `answer` array** for "none of these". It is now an explicit coded answer (`none-of-these`), and "not sure" is coded too (`not-sure`) instead of free text. Both are declared in the Questionnaire. "Nothing seen" is now data, not a missing answer.
- **Undeclared extensions and code systems**: now defined in `fhir/`.
- **Missing narratives** (best-practice warning `dom-6`): every resource now carries a one-line human summary.

## Observation about the OneAquaHealth IG

`observation-indicators-oah` fixes `Observation.status = final`. Citizen data that no one has reviewed yet has no place in that profile, so StreamKeepers keeps held checks as QuestionnaireResponses and only creates indicator Observations once the quality gate or a reviewer accepts them. A `preliminary` status for citizen-science observations could be worth discussing with the IG authors.
