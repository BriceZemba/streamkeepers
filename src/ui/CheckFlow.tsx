import { useEffect, useMemo, useRef, useState } from "react";
import { UNSURE, activeSteps, isAnswered, type Answers, type Question } from "../domain/checkForm";
import { distanceM, getPosition } from "../domain/geo";
import { saveDraft, type Draft } from "../domain/store";
import { useI18n } from "../i18n";
import { Glyph, glyphKey } from "./glyphs";
import type { Mission } from "./useMissions";

export interface CheckDraft {
  answers: Answers;
  startedAt: string;
  submittedAt: string;
  distanceM: number | null;
}

type Gps = { state: "locating" } | { state: "none" } | { state: "fix"; distanceM: number };

export function CheckFlow({ mission, practice, resume, onSubmit, onCancel }: {
  mission: Mission;
  practice: boolean;
  /** A saved draft for this site to continue from. */
  resume?: Draft | null;
  onSubmit: (d: CheckDraft) => void;
  onCancel: () => void;
}) {
  const { t, step: stepTitle, q: qText, opt } = useI18n();
  const startedAt = useRef(resume?.startedAt ?? new Date().toISOString());
  const [answers, setAnswers] = useState<Answers>(resume?.answers ?? {});
  const [stepIdx, setStepIdx] = useState(resume?.stepIdx ?? 0);
  const [gps, setGps] = useState<Gps>({ state: "locating" });
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    let alive = true;
    getPosition().then((p) => {
      if (!alive) return;
      setGps(p ? { state: "fix", distanceM: distanceM(p.lat, p.lon, mission.site.lat, mission.site.lon) } : { state: "none" });
    });
    return () => { alive = false; };
  }, [mission.site.lat, mission.site.lon]);

  // Autosave, so a closed tab or a dead battery doesn't lose the check.
  useEffect(() => {
    if (Object.keys(answers).length === 0) return;
    saveDraft({ siteCode: mission.site.code, answers, stepIdx, startedAt: startedAt.current, savedAt: new Date().toISOString() });
  }, [answers, stepIdx, mission.site.code]);

  const steps = useMemo(() => activeSteps(answers), [answers]);
  const onReview = stepIdx >= steps.length;
  const step = steps[Math.min(stepIdx, steps.length - 1)];
  const stepDone = step.questions.every((q) => isAnswered(q, answers));

  useEffect(() => {
    window.scrollTo({ top: 0 });
    headingRef.current?.focus({ preventScroll: true });
  }, [stepIdx]);

  const set = (id: string, v: string | string[] | undefined) => setAnswers((a) => ({ ...a, [id]: v }));
  const submit = () =>
    onSubmit({ answers, startedAt: startedAt.current, submittedAt: new Date().toISOString(), distanceM: gps.state === "fix" ? gps.distanceM : null });

  const gpsLine = practice
    ? { cls: "", text: t("check.gpsPractice") }
    : gps.state === "locating" ? { cls: "", text: t("check.gpsLocating") }
    : gps.state === "none" ? { cls: "warn", text: t("check.gpsNone") }
    : gps.distanceM <= 250 ? { cls: "ok", text: t("check.gpsOk", { m: Math.round(gps.distanceM) }) }
    : { cls: "warn", text: t("check.gpsFar", { km: (gps.distanceM / 1000).toFixed(1) }) };

  return (
    <section className="check" aria-labelledby="step-h">
      <div className="check-bar">
        <button className="close" onClick={onCancel} aria-label={t("check.cancel")}>✕</button>
        <div className="site">
          {mission.site.name}
          <div className="tiny muted" style={{ fontFamily: "var(--sans)" }}>{t("check.onOffer", { n: mission.value.points })}</div>
        </div>
      </div>

      <div className="stream-progress" role="progressbar" aria-label="Progress" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={Math.min(stepIdx, steps.length)}>
        {steps.map((s, i) => <span key={s.id} className={i < stepIdx ? "done" : i === stepIdx ? "now" : ""} />)}
      </div>
      <p className="gps"><span className={`dot ${gpsLine.cls}`} aria-hidden="true" />{gpsLine.text}</p>

      {onReview ? (
        <>
          <p className="eyebrow">{t("check.lastStep")}</p>
          <h1 id="step-h" className="step-title" ref={headingRef} tabIndex={-1}>{t("check.reviewTitle")}</h1>
          <div className="review-list">
            {steps.map((s, i) => (
              <section key={s.id} className="review-card">
                <header><h3>{stepTitle(s)}</h3><button className="btn btn-quiet" style={{ minHeight: 36 }} onClick={() => setStepIdx(i)}>{t("check.edit")}</button></header>
                <dl style={{ margin: 0 }}>
                  {s.questions.map((q) => {
                    const v = answers[q.id];
                    const list = Array.isArray(v) ? v : v ? [v] : [];
                    const shown = list.length === 0 ? t("check.noneAnswer") : list.map((c) => {
                      if (c === UNSURE) return t("check.unsure");
                      const o = q.options.find((x) => x.code === c);
                      return o ? opt(q, o, "label") : c;
                    }).join(", ");
                    return <div key={q.id} className="review-row"><dt>{qText(q, "title")}</dt><dd>{shown}</dd></div>;
                  })}
                </dl>
              </section>
            ))}
          </div>
        </>
      ) : (
        <>
          <p className="eyebrow">{t("check.step", { i: stepIdx + 1, n: steps.length })} · <span style={{ textTransform: "none", letterSpacing: 0 }}>{t("check.autosaved")}</span></p>
          <h1 id="step-h" className="step-title" ref={headingRef} tabIndex={-1}>{stepTitle(step)}</h1>
          {step.questions.map((q) => <QuestionBlock key={q.id} q={q} value={answers[q.id]} onChange={(v) => set(q.id, v)} />)}
        </>
      )}

      <div className="dock">
        {stepIdx > 0 && <button className="btn" onClick={() => setStepIdx((i) => i - 1)} aria-label={t("check.prev")}>←</button>}
        {onReview ? (
          <button className="btn btn-primary" onClick={submit}>{t("check.send")}</button>
        ) : (
          <button className="btn btn-primary" disabled={!stepDone} onClick={() => setStepIdx((i) => i + 1)}>
            {stepDone ? (stepIdx === steps.length - 1 ? t("check.reviewBtn") : t("check.continue")) : t("check.answerFirst")}
          </button>
        )}
      </div>
    </section>
  );
}

function QuestionBlock({ q, value, onChange }: { q: Question; value: string | string[] | undefined; onChange: (v: string | string[] | undefined) => void }) {
  const { t, q: qText, opt, lang } = useI18n();
  const multi = q.kind === "multi";
  const selected = multi && Array.isArray(value) ? value : [];
  const isOn = (code: string) => (multi ? selected.includes(code) : value === code);
  const toggle = (code: string) => {
    if (!multi) return onChange(code);
    const base = selected.filter((c) => c !== UNSURE);
    onChange(base.includes(code) ? base.filter((c) => c !== code) : [...base, code]);
  };
  const compact = q.options.every((o) => ["YES", "NO"].includes(o.code));
  const hasGlyphs = compact || q.options.some((o) => glyphKey(q.id, o.code) !== o.code);
  const id = `q-${q.id}`;
  return (
    <fieldset className="question">
      <legend id={id}>
        <span className="q-title">{qText(q, "title")}</span>
        <span className="q-term">{qText(q, "term")}</span>
      </legend>
      <p className="q-help">{qText(q, "help")}</p>
      <div className={`cards${compact ? " compact" : ""}`} role="group" aria-labelledby={id}>
        {q.options.map((o) => {
          const hint = opt(q, o, "hint");
          return (
            <button key={o.code} type="button" className="opt" aria-pressed={isOn(o.code)} onClick={() => toggle(o.code)}>
              {hasGlyphs && <Glyph k={glyphKey(q.id, o.code)} size={compact ? 28 : 40} />}
              <span>
                <span className="opt-label" style={{ display: "block" }}>{opt(q, o, "label")}</span>
                {hint && <span className="opt-hint" style={{ display: "block" }}>{hint}</span>}
                {o.official && lang === "en" && <span className="opt-official" style={{ display: "block" }}>{t("check.official", { x: o.official })}</span>}
              </span>
            </button>
          );
        })}
      </div>
      {(multi || q.allowUnsure) && (
        <div className="chips">
          {multi && <button type="button" className="chip" aria-pressed={Array.isArray(value) && value.length === 0} onClick={() => onChange([])}>{t("check.none")}</button>}
          {q.allowUnsure && (
            <button type="button" className="chip" aria-pressed={multi ? selected.includes(UNSURE) : value === UNSURE} onClick={() => onChange(multi ? [UNSURE] : UNSURE)}>
              {t("check.unsure")}
            </button>
          )}
        </div>
      )}
    </fieldset>
  );
}
