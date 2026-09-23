import { useEffect, useMemo, useRef, useState } from "react";
import { UNSURE, activeSteps, isAnswered, type Answers, type Question } from "../domain/checkForm";
import { distanceM, getPosition } from "../domain/geo";
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
  const onSummary = stepIdx >= steps.length;
  const step = steps[Math.min(stepIdx, steps.length - 1)];
  const stepDone = step.questions.every((q) => isAnswered(q, answers));

  useEffect(() => headingRef.current?.focus(), [stepIdx]);

  const set = (id: string, v: string | string[] | undefined) => setAnswers((a) => ({ ...a, [id]: v }));

  const submit = () =>
    onSubmit({ answers, startedAt: startedAt.current, submittedAt: new Date().toISOString(), distanceM: gps.state === "fix" ? gps.distanceM : null });

  return (
    <section className="check" aria-labelledby="step-h">
      <div className="check-top">
        <button className="btn btn-ghost" onClick={onCancel}>✕ Cancel</button>
        <span className="muted small">{mission.site.name} · {mission.value.points} pts</span>
      </div>
      <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={Math.min(stepIdx, steps.length)} aria-label="Progress">
        <div style={{ width: `${(Math.min(stepIdx, steps.length) / steps.length) * 100}%` }} />
      </div>
      <p className="gps small">
        {practice ? "Practice mode: your location is not checked." :
          gps.state === "locating" ? "Finding your position…" :
          gps.state === "none" ? "No GPS position. You can continue; a reviewer will confirm the location." :
          gps.distanceM <= 250 ? `You're at the site (${Math.round(gps.distanceM)} m).` :
          `You're ${(gps.distanceM / 1000).toFixed(1)} km from this site. Checks made away from the stream go to review.`}
      </p>

      {onSummary ? (
        <Summary answers={answers} headingRef={headingRef} onEdit={(i) => setStepIdx(i)} steps={steps} />
      ) : (
        <>
          <h2 id="step-h" ref={headingRef} tabIndex={-1}>{step.title} <span className="muted small">({stepIdx + 1}/{steps.length})</span></h2>
          {step.questions.map((q) => <QuestionBlock key={q.id} q={q} value={answers[q.id]} onChange={(v) => set(q.id, v)} />)}
        </>
      )}

      <div className="actions sticky">
        {stepIdx > 0 && <button className="btn" onClick={() => setStepIdx((i) => i - 1)}>Back</button>}
        {onSummary ? (
          <button className="btn btn-primary" onClick={submit}>Send my check</button>
        ) : (
          <button className="btn btn-primary" disabled={!stepDone} onClick={() => setStepIdx((i) => i + 1)}>
            {stepDone ? "Next" : "Answer to continue"}
          </button>
        )}
      </div>
    </section>
  );
}

function QuestionBlock({ q, value, onChange }: { q: Question; value: string | string[] | undefined; onChange: (v: string | string[] | undefined) => void }) {
  const multi = q.kind === "multi";
  const selected = multi ? (Array.isArray(value) ? value : []) : [];
  const toggle = (code: string) => {
    if (!multi) return onChange(code);
    const base = selected.filter((c) => c !== UNSURE);
    onChange(base.includes(code) ? base.filter((c) => c !== code) : [...base, code]);
  };
  const isOn = (code: string) => (multi ? selected.includes(code) : value === code);
  const groupId = `q-${q.id}`;
  return (
    <fieldset className="question">
      <legend id={groupId}>
        {q.title}
        <small className="term">{q.term}</small>
      </legend>
      <p className="muted small">{q.help}</p>
      <div className="options" role="group" aria-labelledby={groupId}>
        {q.options.map((o) => (
          <button key={o.code} type="button" className="option" aria-pressed={isOn(o.code)} onClick={() => toggle(o.code)}>
            <span className="opt-label">{o.label}</span>
            {o.hint && <span className="opt-hint">{o.hint}</span>}
            {o.official && <span className="opt-official">Official: {o.official}</span>}
          </button>
        ))}
        {multi && (
          <button type="button" className="option option-minor" aria-pressed={Array.isArray(value) && value.length === 0} onClick={() => onChange([])}>
            None of these
          </button>
        )}
        {q.allowUnsure && (
          <button type="button" className="option option-minor" aria-pressed={multi ? selected.includes(UNSURE) : value === UNSURE} onClick={() => onChange(multi ? [UNSURE] : UNSURE)}>
            Not sure
          </button>
        )}
      </div>
    </fieldset>
  );
}

function Summary({ answers, steps, onEdit, headingRef }: { answers: Answers; steps: ReturnType<typeof activeSteps>; onEdit: (i: number) => void; headingRef: React.RefObject<HTMLHeadingElement | null> }) {
  const show = (q: Question) => {
    const v = answers[q.id];
    const codes = Array.isArray(v) ? v : v ? [v] : [];
    if (codes.length === 0) return "None";
    return codes.map((c) => (c === UNSURE ? "Not sure" : q.options.find((o) => o.code === c)?.label ?? c)).join(", ");
  };
  return (
    <>
      <h2 id="step-h" ref={headingRef} tabIndex={-1}>Check your answers</h2>
      {steps.map((s, i) => (
        <div key={s.id} className="summary-block">
          <div className="summary-head"><h3>{s.title}</h3><button className="btn btn-ghost small" onClick={() => onEdit(i)}>Edit</button></div>
          <dl>
            {s.questions.map((q) => (
              <div key={q.id} className="summary-row"><dt>{q.title}</dt><dd>{show(q)}</dd></div>
            ))}
          </dl>
        </div>
      ))}
    </>
  );
}
