# User test results

Protocol: [docs/TESTING.md](../docs/TESTING.md), section 3. Two waves: wave 1 on the deployed app, then fixes, then wave 2 on the fixed app with different people. Results of the two waves are reported separately and never merged.

**Wave 1 was informal:** the author showed the app over a video call without the task script, timings or SUS questionnaire. It gives qualitative findings only; the measured results come from wave 2.

| Wave | Date | App version (commit) | n | Mode |
|---|---|---|---|---|
| 1 | 2026-09-24 | 71d09de | 2 | Remote video call (one on WhatsApp, one on Google Meet), informal: no timed tasks, no SUS |
| 2 | 2026-09-25 to 2026-09-26 | 9686377 | 5 | 4 moderated video calls (Google Meet, task script read aloud); 1 unmoderated (P7 received the written instructions only) |

No names. All participants are people known to the author (friends and acquaintances), which likely makes scores kinder than those of strangers. Answers were given in French; the notes below are the author's, translated to English.

## Participants

| P | Wave | Mode | Age | Used a citizen-science or nature app before? | Device | Language |
|---|---|---|---|---|---|---|
| P1 | 1 | WhatsApp or Meet call, informal | 23 | No | – | French |
| P2 | 1 | WhatsApp or Meet call, informal | 24 | No | – | French |
| P3 | 2 | Meet, moderated | 24 | No | Phone | French |
| P4 | 2 | Meet, moderated | 20 | No | Computer | French |
| P5 | 2 | Meet, moderated | 27 | No | Phone | French |
| P6 | 2 | Meet, moderated | 25 | No | Phone | French |
| P7 | 2 | Written instructions only (unmoderated) | 19 | No | Computer | French |

## Tasks (wave 2)

Result codes: **OK** = done without help, **H** = done with help (a hint after 60 s stuck), **X** = not done, **partial** = done but the explanation asked for was incomplete.

- T1: find the Coimbra stream worth the most, and say why.
- T2: say why Exploratório is worth so few points.
- T3: do a full check at Mina Hospital, answering as if standing there.
- T4: look at the result and say what happened to the points and why.

| P | T1 | T1 time (s) | T2 | T3 | T3 duration | T3 quality check | Hints given | Author's notes |
|---|---|---|---|---|---|---|---|---|
| P3 | OK | 15 | H | OK | 92 s (stopwatch and app) | accepted, points credited at once | 1, on T2 | Knew nothing about the streams or the organisation beforehand. |
| P4 | partial | 30 | H (see below) | H | not recorded | accepted, points credited at once | 1, on T2 | Found the top stream but didn't fully explain why. |
| P5 | partial | 19 | H (see below) | H | not recorded | accepted, points credited at once | 1, on T2 | Found the top stream, took some time to explain why. |
| P6 | OK | 14 | H | OK | not recorded | accepted, points credited at once | 1, on T2 | |
| P7 | OK | 33 | X | OK | not recorded | accepted, points credited at once | none (unmoderated) | Said afterwards they were a little distracted. |

- **T2 for P4 and P5** was first noted as OK, but a hint on T2 is recorded for both, so it is counted as done with help.
- **T3 duration** was recorded reliably for P3 only: 92 s on the stopwatch and in the app. For the others the timing notes can't be mapped to a column afterwards, so no duration is claimed for them. All five checks passed the quality check at once (reported by the author), and the check can only pass when it took at least 90 s, so every check lasted 90 s or more.
- **T4 is not reported:** it was not noted in a usable form.

## SUS (System Usability Scale, wave 2)

Answers 1 (strongly disagree) to 5 (strongly agree). Score = ((Q1−1)+(5−Q2)+(Q3−1)+(5−Q4)+(Q5−1)+(5−Q6)+(Q7−1)+(5−Q8)+(Q9−1)+(5−Q10)) × 2.5, from 0 to 100. 68 is the usual average.

| P | Q1 | Q2 | Q3 | Q4 | Q5 | Q6 | Q7 | Q8 | Q9 | Q10 | Score |
|---|---|---|---|---|---|---|---|---|---|---|---|
| P3 | 4 | 1 | 5 | 1 | 4 | 2 | 4 | 3 | 4 | 2 | **80** |
| P4 | 5 | 2 | 4 | 2 | 4 | 1 | 3 | 2 | 4 | 3 | **75** |
| P5 | 4 | 1 | 4 | 2 | 4 | 1 | 3 | 2 | 5 | 1 | **82.5** |
| P6 | 5 | 2 | 4 | 2 | 5 | 3 | 2 | 3 | 1 | 3 | **60** |
| P7 | 5 | 1 | 5 | 1 | 5 | 3 | 1 | 3 | 1 | 2 | **67.5** |

Comments given with the answers: P3, Q1 "if I was interested", Q3 "very easy to use", Q9 lowered by the location request (accepted because it seemed necessary); P4, Q1 "the design looks good"; P5, Q4 "genuinely very intuitive"; P6, Q6 "surprisingly neutral".

## Open questions (wave 2)

| P | Would go back next season (1–5) | Why | Anything that made you want to exaggerate or rush? | One thing to change |
|---|---|---|---|---|
| P3 | 4 | "I'm a volunteer and the app makes it easier." | No | Nothing to add |
| P4 | 3 | Already visited that stream, would prefer others | No | "I think the app is great." |
| P5 | 2 | – | No | "The app is not bad, and the design is great." |
| P6 | 5 | (Author's note: likes travelling.) | No (seemed unsure what the question meant) | A way to connect with others and see what they say about the streams they visited |
| P7 | 2 | – | No | Nothing to add |

Wave 1 (P1, P2, informal): both said they would use it "if this kind of activity appealed to them" and found it "very interesting"; no other criticism.

## Problems observed

One row per problem. Severity: **3** blocks the task, **2** slows or confuses, **1** cosmetic.

| # | Problem | Seen with | Severity | Fix (commit) |
|---|---|---|---|---|
| 1 | Opening the app with no explanation, they didn't know what to expect or what to do, and struggled until the author explained. Once explained, both understood at once and said the app is "very easy to use". | P1, P2 | 3 | Before wave 2: first-visit welcome with the 3 steps (pick a stream, look and answer, earn the points), an example mission, and a "How it works" button to reopen it. 9686377 |
| 2 | (Found by the author while fixing #1, not by testers.) On 360–375 px phones the header was wider than the screen, so the page could scroll sideways. | – | 2 | Before wave 2: compact header on phones. 9686377 |
| 3 | Why a busy site is worth few points (T2): nobody explained it without a hint. The reason ("already checked 9× this season") was the last line of the points list, in technical wording ("need × 0.10"). | P3, P4, P5, P6 (hint); P7 (not done) | 2 | After wave 2: that reason now comes first, in plain words. e5926cc. **Not re-tested.** |
| 4 | In practice mode, starting a check asked for the phone's location although practice mode doesn't use it; it lowered one tester's confidence. | P3 | 2 | After wave 2: practice mode no longer asks for the location. e5926cc. **Not re-tested.** |
| 5 | Two testers found the most valuable stream but couldn't fully say why (T1). | P4, P5 | 2 | Not changed. |
| 6 | Without a facilitator, the tester did not work out T2 and reported low confidence (SUS Q9 = 1, Q7 = 1). | P7 | 2 | Not changed; one unmoderated participant only. |
| 7 | Wish for a way to talk with other volunteers about the streams they visited. | P6 | – | Not built by design: the Journal links each adopted stream to its group on the OneAquaHealth Community instead of adding a separate social network. |

## Summary

| | Wave 1 | Wave 2 |
|---|---|---|
| n | 2 (informal) | 5 (4 moderated, 1 unmoderated) |
| T1: top stream found | not measured | 5/5 (3 with a full explanation), median 19 s (14–33 s) |
| T2: why a busy site is worth little, without help | not measured; 0/2 knew what to do before the explanation | 0/5 (4 with a hint, 1 not done) |
| T3: full check completed | not measured | 5/5 (3 without help, 2 with help) |
| T3: passed the quality check, points credited at once | not measured | 5/5 |
| T3 duration | not measured | 92 s for P3; others not recorded, each at least 90 s (see Tasks) |
| SUS | not measured | median **75** (60–82.5), mean 73; moderated only: median 77.5 |
| Would go back next season | not rated | median 3 of 5 (2, 2, 3, 4, 5) |
| Wanted to exaggerate or rush | not asked | 0/5 |

Changes made between the waves: first-visit welcome screen and compact phone header (problems 1 and 2), commit 9686377. Changes made after wave 2 and not re-tested: problems 3 and 4, commit e5926cc.

Limits: small sample (n = 5), all participants aged 19–27 and known to the author, one unmoderated session, 2 of 5 on a computer rather than a phone, practice mode (nobody was standing at a real stream), remote sessions, notes taken and translated by the author. Check durations were recorded reliably for one participant only.
