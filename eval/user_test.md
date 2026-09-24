# User test results

Protocol: [docs/TESTING.md](../docs/TESTING.md), section 3. Two waves: wave 1 on the deployed app, then fixes, then wave 2 on the fixed app with different people. Results of the two waves are reported separately and never merged.

**Wave 1 was informal:** the author showed the app over a video call without the task script, timings or SUS questionnaire. It gives qualitative findings only; the measured results come from wave 2.

| Wave | Date | App version (commit) | n | Mode |
|---|---|---|---|---|
| 1 | 2026-09-24 | a3b57d3 | 2 | Remote video call (Google Meet), informal: no timed tasks, no SUS |
| 2 | 2026-09-25 to 2026-09-27 | 8c8018e or later | [FILL] | [FILL] |

No names. P1…P8. Wave 1 participants are friends of the author; wave 2: [FILL]. People known to the author, which likely makes scores kinder than those of strangers.

## Participants

| P | Wave | Mode | Age range | Used a citizen-science or nature app before? | Phone | Language used |
|---|---|---|---|---|---|---|
| P1 | 1 | Meet | 23 | No | | French |
| P2 | 1 | Meet | 24 | No | | French |
| P3 | 2 | | | | | |
| P4 | 2 | | | | | |
| P5 | 2 | | | | | |
| P6 | 2 | | | | | |
| P7 | 2 | | | | | |
| P8 | 2 | | | | | |

## Tasks

Result codes: **OK** = done without help, **H** = done with help (a hint after 60 s stuck), **X** = not done.

- T1: find the Coimbra stream worth the most, and say why.
- T2: say why Exploratório is worth so few points.
- T3: do a full check at Mina Hospital, answering as if standing there.
- T4: look at the result and say what happened to the points and why.

| P | T1 | T1 time (s) | T2 | T3 | T3 time, stopwatch (s) | T3 time shown by the app (s) | T3 gate outcome | T4 | Hints given (what) |
|---|---|---|---|---|---|---|---|---|---|
| P1 | not run (informal session) | | | | | | | | |
| P2 | not run (informal session) | | | | | | | | |
| P3 | | | | | | | | | |
| P4 | | | | | | | | | |
| P5 | | | | | | | | | |
| P6 | | | | | | | | | |
| P7 | | | | | | | | | |
| P8 | | | | | | | | | |

## SUS (System Usability Scale)

Answers 1 (strongly disagree) to 5 (strongly agree). Score = ((Q1−1)+(5−Q2)+(Q3−1)+(5−Q4)+(Q5−1)+(5−Q6)+(Q7−1)+(5−Q8)+(Q9−1)+(5−Q10)) × 2.5, from 0 to 100. 68 is the usual average.

| P | Q1 | Q2 | Q3 | Q4 | Q5 | Q6 | Q7 | Q8 | Q9 | Q10 | Score |
|---|---|---|---|---|---|---|---|---|---|---|---|
| P1 | not asked | | | | | | | | | | |
| P2 | not asked | | | | | | | | | | |
| P3 | | | | | | | | | | | |
| P4 | | | | | | | | | | | |
| P5 | | | | | | | | | | | |
| P6 | | | | | | | | | | | |
| P7 | | | | | | | | | | | |
| P8 | | | | | | | | | | | |

## Open questions

| P | Would go back next season (1–5) | Why | Anything that made you want to exaggerate or rush? | One thing to change |
|---|---|---|---|---|
| P1, P2 | not rated | "If this kind of activity appealed to them they would use it"; found it "very interesting" (reported by the author, both agreed) | not asked | nothing else (no further criticism) |
| P3 | | | | |
| P4 | | | | |
| P5 | | | | |
| P6 | | | | |
| P7 | | | | |
| P8 | | | | |

## Problems observed

One row per problem. Severity: **3** blocks the task, **2** slows or confuses, **1** cosmetic.

| # | Problem | Seen with | Severity | Fixed before wave 2? (commit) |
|---|---|---|---|---|
| 1 | Opening the app with no explanation, they didn't know what to expect or what to do, and struggled until the author explained. Once explained, both understood at once and said the app is "very easy to use". | P1, P2 | 3 | Yes: first-visit welcome with the 3 steps (pick a stream, look and answer, earn the points), an example mission, and a "How it works" button to reopen it. Commit 8c8018e |
| 2 | (Found by the author while fixing #1, not by testers.) On 360–375 px phones the header was wider than the screen, so the page could scroll sideways. | – | 2 | Yes: compact header on phones. Same commit |

## Summary

| | Wave 1 | Wave 2 |
|---|---|---|
| n | 2 (informal) | [FILL] |
| T3 (full check) completed without help | not measured | [FILL] / n |
| T3 median time (range) | not measured | [FILL] |
| T1+T2+T4 understood without help | not measured; 0/2 knew what to do before the explanation | [FILL] / 3n |
| SUS median (range) | not measured | [FILL] |
| Would go back next season, median | not rated (both: "would use it if this kind of activity appealed to them") | [FILL] |

Changes made between the waves: first-visit welcome screen and compact phone header (problems 1 and 2), commit 8c8018e.

Limits: small sample, wave 1 informal and reported by the author, participants known to the author, practice mode (nobody was standing at a real stream), remote sessions.
