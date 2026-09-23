# Testing StreamKeepers

## 1. On your computer (fastest)

```bash
npm install
npm run dev
```

Open http://localhost:5173 and switch the browser to a phone size (F12, then the device toolbar).
Add `?practice=1` to try checks from home: http://localhost:5173/?practice=1

Things to try:
- Coimbra list: **Mina Hospital** (116 pts, not checked this season) vs **Exploratório** (15 pts, checked 9× this season, simulated activity).
- Open a mission card: every point has a reason.
- Do a check in under 90 s: it is held for review, not deleted.
- Do a careful check (≥ 90 s) in practice mode: points are credited.
- Rate a stream **Good** but report sewage: the consistency rule asks a reviewer to look.
- **Journal** tab: history, points, adopted stream and season streak, settings (practice mode, simulated activity, FHIR server), reset.
- Header: **language toggle** (EN → PT → FR, also `?lang=pt`) and **light/dark toggle** (starts from the phone's setting).
- **Search** a site (accent-insensitive: "estacao" finds "Estação Cbr-B") and sort by **Nearest** (needs location permission).
- Mission page: **Directions** (opens the phone's map app) and **Adopt this stream** (+15 pts for its seasonal check, season streak in the Journal).
- Mission page: **Remind me** (adds a calendar event; for your adopted stream it repeats every season) and **Invite a friend** (share sheet, or copy the link). Links like `?site=C5` open that mission directly.
- Journal: **Add seasonal reminder** and a link to the stream's group on the OneAquaHealth Community.
- Close a check halfway, reopen the app: a **Resume** banner offers to continue where you stopped.
- Go offline (DevTools → Network → Offline): a banner appears; checks stay on the phone and are sent when the connection returns.

- Map views (top right of the map): **Plan**, **Satellite** and **3D** relief. Mission page: **Street View** opens Google Street View at the site.
  3D uses MapLibre 6, whose worker only loads in a production build. To try 3D locally run `npm run build && npm run preview` (the dev server shows an empty 3D map).

Automated checks:

```bash
npm test         # domain rules: mission value, quality gate
npm run build    # type check + production build
```

## 2. On your phone (same Wi-Fi)

```bash
npm run dev:phone
```

Open the `Network:` address it prints (e.g. `http://192.168.1.20:5173/?practice=1`) on your phone.
Browsers only share GPS with HTTPS pages, so on this local address use practice mode.
For real GPS, use the hosted HTTPS version (from Fri Sep 25).

## 3. User test (5–8 people, ~15 min each, two waves)

Wave 1 on Fri Sep 25, fixes on Sat Sep 26, wave 2 on Sun Sep 27 with the fixed app and different people. Report the waves separately.

Use the hosted link with `?practice=1` (add `&lang=fr` or `&lang=pt` for the participant's language). Remote over video call with screen sharing is fine. Don't help unless the person is stuck for more than 60 s, and note where they got stuck.

**Before (1 min):** age range, ever used a citizen-science or nature app (yes/no), phone type.

**Tasks** (record time and whether they complete it without help):
1. "Find the stream in Coimbra where a check is worth the most. Why is it worth that much?" (comprehension)
2. "Why is Exploratório worth so few points?" (comprehension of coverage)
3. "Do a full stream check at Mina Hospital, answering as if you were standing there." (time to complete, errors, questions asked)
4. "Look at the result. What happened to your points and why?"

**After:**
- SUS questionnaire (10 standard statements, 1–5 scale) → score 0–100.
- "Would you go back next season to check the same stream? Why?" (1–5 + one sentence)
- "Did anything make you want to exaggerate or rush?" (open)
- "One thing to change?" (open)

**Record** results in `eval/user_test.md`: one row per person (no names, P1…P8), task times, completions, SUS, quotes. Report the median and range, and state n honestly. Failures and complaints go in too.
