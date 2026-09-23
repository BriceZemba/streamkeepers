import { useEffect, useMemo, useRef, useState } from "react";
import { UNSURE, activeSteps, isAnswered, type Answers, type Question } from "../domain/checkForm";
import { distanceM, getPosition } from "../domain/geo";
import { Glyph, glyphKey } from "./glyphs";
import type { Mission } from "./useMissions";

export interface CheckDraft {
  answers: Answers;
  startedAt: string;
  submittedAt: string;
  distanceM: number | null;
}

type Gps = { state: "locating" } | { state: "none" } | { state: "fix"; distanceM: number };

export function CheckFlow({ mission, practice, onSubmit, onCancel }: { mission: Mission; practice: boolean; onSubmit: (d: CheckDraft) => void; onCancel: () => void }) {
  const startedAt = useRef(new Date().toISOString());
  const [answers, setAnswers] = useState<Answers>({});
  const [stepIdx, setStepIdx] = useState(0);
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
    ? { cls: "", text: "Practice mode: your location isn't checked." }
    : gps.state === "locating" ? { cls: "", text: "Finding your position…" }
    : gps.state === "none" ? { cls: "warn", text: "No GPS position. You can continue; a reviewer will confirm the location." }
    : gps.distanceM <= 250 ? { cls: "ok", text: `You're at the stream (${Math.round(gps.distanceM)} m from the site).` }
    : { cls: "warn", text: `You're ${(gps.distanceM / 1000).toFixed(1)} km from this site. Checks made away from the stream go to a reviewer.` };

  return (
    <section className="check" aria-labelledby="step-h">
      <div className="check-bar">
        <button className="close" onClick={onCancel} aria-label="Cancel check">✕</button>
        <div className="site">
          {mission.site.name}
          <div className="tiny muted" style={{ fontFamily: "var(--sans)" }}>{mission.value.points} pts on offer</div>
        </div>
      </div>

      <div className="stream-progress" role="progressbar" aria-label="Progress" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={Math.min(stepIdx, steps.length)}>
        {steps.map((s, i) => <span key={s.id} className={i < stepIdx ? "done" : i === stepIdx ? "now" : ""} />)}
      </div>
      <p className="gps"><span className={`dot ${gpsLine.cls}`} aria-hidden="true" />{gpsLine.text}</p>

      {onReview ? (
        <Review answers={answers} steps={steps} headingRef={headingRef} onEdit={setStepIdx} />
      ) : (
        <>
          <p className="eyebrow">Step {stepIdx + 1} of {steps.length}</p>
          <h1 id="step-h" className="step-title" ref={headingRef} tabIndex={-1}>{step.title}</h1>
          {step.questions.map((q) => <QuestionBlock key={q.id} q={q} value={answers[q.id]} onChange={(v) => set(q.id, v)} />)}
        </>
      )}

      <div className="dock">
        {stepIdx > 0 && <button className="btn" onClick={() => setStepIdx((i) => i - 1)} aria-label="Previous step">←</button>}
        {onReview ? (
          <button className="btn btn-primary" onClick={submit}>Send my check</button>
        ) : (
          <button className="btn btn-primary" disabled={!stepDone} onClick={() => setStepIdx((i) => i + 1)}>
            {stepDone ? (stepIdx === steps.length - 1 ? "Review answers" : "Continue") : "Answer to continue"}
          </button>
        )}
      </div>
    </section>
  );
}

function QuestionBlock({ q, value, onChange }: { q: Question; value: string | string[] | undefined; onChange: (v: string | string[] | undefined) => void }) {
  const multi = q.kind === "multi";
  const selected = multi && Array.isArray(value) ? value : [];
  const isOn = (code: string) => (multi ? selected.includes(code) : value === code);
  const toggle = (code: string) => {
    if (!multi) return onChange(code);
    const base = selected.filter((c) => c !== UNSURE);
    onChange(base.includes(code) ? base.filter((c) => c !== code) : [...base, code]);
  };
  const hasGlyphs = q.options.some((o) => glyphKey(q.id, o.code) !== o.code || ["YES", "NO"].includes(o.code));
  const compact = q.options.every((o) => ["YES", "NO"].includes(o.code));
  const id = `q-${q.id}`;
  return (
    <fieldset className="question">
      <legend id={id}>
        <span className="q-title">{q.title}</span>
        <span className="q-term">{q.term}</span>
      </legend>
      <p className="q-help">{q.help}{multi && " Choose all that apply."}</p>
      <div className={`cards${compact ? " compact" : ""}`} role="group" aria-labelledby={id}>
        {q.options.map((o) => (
          <button key={o.code} type="button" className="opt" aria-pressed={isOn(o.code)} onClick={() => toggle(o.code)}>
            {hasGlyphs && <Glyph k={glyphKey(q.id, o.code)} size={compact ? 28 : 40} />}
            <span>
              <span className="opt-label" style={{ display: "block" }}>{o.label}</span>
              {o.hint && <span className="opt-hint" style={{ display: "block" }}>{o.hint}</span>}
              {o.official && <span className="opt-official" style={{ display: "block" }}>Official: {o.official}</span>}
            </span>
          </button>
        ))}
      </div>
      {(multi || q.allowUnsure) && (
        <div className="chips">
          {multi && <button type="button" className="chip" aria-pressed={Array.isArray(value) && value.length === 0} onClick={() => onChange([])}>None of these</button>}
          {q.allowUnsure && (
            <button type="button" className="chip" aria-pressed={multi ? selected.includes(UNSURE) : value === UNSURE} onClick={() => onChange(multi ? [UNSURE] : UNSURE)}>
              Not sure
            </button>
          )}
        </div>
      )}
    </fieldset>
  );
}

function Review({ answers, steps, onEdit, headingRef }: { answers: Answers; steps: ReturnType<typeof activeSteps>; onEdit: (i: number) => void; headingRef: React.RefObject<HTMLHeadingElement | null> }) {
  const show = (q: Question) => {
    const v = answers[q.id];
    const list = Array.isArray(v) ? v : v ? [v] : [];
    if (list.length === 0) return "None";
    return list.map((c) => (c === UNSURE ? "Not sure" : q.options.find((o) => o.code === c)?.label ?? c)).join(", ");
  };
  return (
    <>
      <p className="eyebrow">Last step</p>
      <h1 id="step-h" className="step-title" ref={headingRef} tabIndex={-1}>Check your answers</h1>
      <div className="review-list">
        {steps.map((s, i) => (
          <section key={s.id} className="review-card">
            <header><h3>{s.title}</h3><button className="btn btn-quiet" style={{ minHeight: 36 }} onClick={() => onEdit(i)}>Edit</button></header>
            <dl style={{ margin: 0 }}>
              {s.questions.map((q) => <div key={q.id} className="review-row"><dt>{q.title}</dt><dd>{show(q)}</dd></div>)}
            </dl>
          </section>
        ))}
      </div>
    </>
  );
}
