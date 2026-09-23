# StreamKeepers

**Citizen-science points that follow what science needs, not how many reports you file.**

OneAquaHealth IEEE Global Hackathon 2026 · **Track 5: Community & Gamification**

> Work in progress (hackathon build, Sep 23–29, 2026). This README will be completed before submission.

**Live app:** https://streamkeepers.vercel.app (add `?practice=1` to try a check from anywhere, `?lang=pt` or `?lang=fr` for Portuguese or French).

Most gamified citizen-science apps pay per report, so volunteers cluster at the same popular spot while streams that researchers need stay unvisited. StreamKeepers prices every stream-check mission from OneAquaHealth's own data gaps (time since the last lab campaign, whether anyone has checked the site this season, lab health risk, people living near the water) and shows the reason behind every point. Points never depend on the result a volunteer reports.

## Data

All sites, lab health-risk campaigns and land-use parameters come from the public OneAquaHealth / ENORA API (`https://api.enora-oah.eu/api`), snapshotted into `src/data/oah/` with fetch time and SHA-256 in `manifest.json`. Answer codes match the official OneAquaHealth Citizen Science App vocabularies.

```bash
npm install
npm run snapshot   # refresh the OneAquaHealth data snapshot
npm test
npm run dev
```

## Known limits (so far)

- Every lab campaign in the public data dates from 2023–2024, so the lab-staleness component is at or near its cap for all research sites; it does not currently rank research sites against each other.
- Mission weights are policy choices, visible and editable; they are not validated science.

## License

MIT
