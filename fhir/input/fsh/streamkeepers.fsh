// Extensions and codes StreamKeepers adds to a citizen stream check.
// Answer vocabularies are generated from the app (vocabulary.fsh, npm run fhir:vocab).

Extension: MissionPoints
Id: mission-points
Title: "StreamKeepers mission points"
Description: "Points the mission was worth when the check was submitted (from OneAquaHealth data gaps; never from the reported result)."
Context: QuestionnaireResponse
* value[x] only integer

Extension: CreditedPoints
Id: credited-points
Title: "StreamKeepers credited points"
Description: "Points actually credited: the mission points if the quality gate or a reviewer accepted the check, otherwise 0."
Context: QuestionnaireResponse
* value[x] only integer

Extension: QualityGate
Id: quality-gate
Title: "StreamKeepers quality gate"
Description: "Outcome of the automatic quality gate and the result of each rule (complete, careful, at the site, consistent, new visit)."
Context: QuestionnaireResponse
* extension contains outcome 1..1 and rule 0..*
* extension[outcome] ^short = "accepted | review"
* extension[outcome].value[x] only code
* extension[rule] ^short = "rule: pass|hold (message)"
* extension[rule].value[x] only string

CodeSystem: StreamKeepers
Id: streamkeepers
Title: "StreamKeepers codes"
Description: "Tag and component codes used by StreamKeepers where the OneAquaHealth temporary code system has no concept."
* ^status = #draft
* ^caseSensitive = true
* ^content = #complete
* #streamkeepers "Created by StreamKeepers"
* #channel-type "Channel type"
* #channel-form "Channel form"
* #bank-type "Bank type"
* #habitat "Habitat present"
* #natural-debris "Natural debris present"
* #water-flow "Water flow"
* #water-aspect "Water aspect"
* #sewage-signs "Signs of sewage (smell, grey water, paper)"
* #impervious-margins "Paved or built-up margins"
* #draining-pipes "Draining pipes"
* #construction "Construction in or near the stream"
* #barriers "Barriers to flow"
* #citizen-overall-assessment "Citizen overall stream assessment"
* #none-of-these "None of these"
* #not-sure "Not sure"
