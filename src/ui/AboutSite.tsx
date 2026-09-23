import { siteProfile } from "../domain/siteProfile";
import type { SiteFacts } from "../domain/siteFacts";
import { useI18n } from "../i18n";

/** "What we know about this site", built only from OneAquaHealth data. */
export function AboutSite({ site }: { site: SiteFacts }) {
  const { t, tm, num, lang } = useI18n();
  const locale = lang === "pt" ? "pt-PT" : lang === "fr" ? "fr-FR" : "en-GB";
  const dist = (m: number) => (m < 1000 ? `${num(Math.round(m / 10) * 10)} m` : `${num(m / 1000, m < 10_000 ? 1 : 0)} km`);
  const lines = siteProfile(site);
  return (
    <section className="about" aria-labelledby={`about-${site.code}`}>
      <h3 id={`about-${site.code}`}>{t("about.title")}</h3>
      <ul>
        {lines.map((l, i) => {
          const params: Record<string, string | number> = { ...(l.params ?? {}) };
          if (typeof params.level === "string") params.level = t(params.level);
          for (const k of ["sewage", "hospital", "farm"]) if (typeof params[k] === "number") params[k] = dist(params[k] as number);
          if (l.key === "about.proposed" && typeof params.day === "string" && params.day) {
            params.day = new Date(params.day + "T00:00:00Z").toLocaleDateString(locale, { dateStyle: "medium", timeZone: "UTC" });
          }
          const text = tm({ key: l.key, params }, "");
          return (
            <li key={`${l.key}-${i}`} className={`${l.tone ? `tone-${l.tone}` : ""}${l.key === "about.scaleNote" ? " note-line" : ""}${l.key.startsWith("about.pathogen") || l.key.startsWith("about.fecal") || l.key.startsWith("about.arg") ? " indent" : ""}`}>
              {l.tone && <span className="level-dot" aria-hidden="true" />}
              {text}
            </li>
          );
        })}
      </ul>
      <p className="tiny muted" style={{ margin: "8px 0 0" }}>{t("about.source")}</p>
    </section>
  );
}
