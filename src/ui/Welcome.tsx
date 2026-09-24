import { useEffect, useRef } from "react";
import { useI18n } from "../i18n";

// First-visit explanation. In the first user test, people who opened the app with no
// explanation didn't know what to expect; once told the three steps below, they found it easy.
const KEY = "sk.welcome.v1";

export function welcomeSeen(): boolean {
  try { return localStorage.getItem(KEY) === "1"; } catch { return false; }
}

function markSeen() {
  try { localStorage.setItem(KEY, "1"); } catch { /* ignore */ }
}

export function Welcome({ practice, example, onClose, onExample }: {
  practice: boolean;
  /** The most useful mission right now, opened by the example button. */
  example: { name: string } | null;
  onClose: () => void;
  onExample: () => void;
}) {
  const { t } = useI18n();
  const box = useRef<HTMLDivElement>(null);
  const close = () => { markSeen(); onClose(); };

  useEffect(() => {
    box.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const steps = [
    { n: 1, title: t("welcome.s1.title"), text: t("welcome.s1.text") },
    { n: 2, title: t("welcome.s2.title"), text: t("welcome.s2.text") },
    { n: 3, title: t("welcome.s3.title"), text: t("welcome.s3.text") },
  ];

  return (
    <div className="welcome-backdrop" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="welcome" role="dialog" aria-modal="true" aria-labelledby="welcome-title" tabIndex={-1} ref={box}>
        <button className="welcome-x" onClick={close} aria-label={t("welcome.close")}>×</button>
        <p className="eyebrow">{t("welcome.eyebrow")}</p>
        <h2 id="welcome-title">{t("welcome.title")}</h2>
        <p className="muted welcome-lead">{t("welcome.lead")}</p>
        <ol className="welcome-steps">
          {steps.map((s) => (
            <li key={s.n}>
              <span className="welcome-n" aria-hidden="true">{s.n}</span>
              <span><strong>{s.title}</strong><br />{s.text}</span>
            </li>
          ))}
        </ol>
        {practice && <p className="tiny welcome-practice">◎ {t("welcome.practice")}</p>}
        {example && (
          <button className="btn btn-primary btn-block" onClick={() => { markSeen(); onExample(); }}>
            {t("welcome.example", { site: example.name })}
          </button>
        )}
        <button className={`btn btn-block ${example ? "btn-quiet" : "btn-primary"}`} onClick={close}>{t("welcome.explore")}</button>
      </div>
    </div>
  );
}
