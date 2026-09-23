import { useEffect, useRef, useState } from "react";
import { googleCalendarUrl, outlookCalendarUrl, reminderIcs, type ReminderInput } from "../domain/reminder";
import { useI18n } from "../i18n";
import { downloadIcs } from "./actions";

/** "Remind me" with a choice of calendar: Google and Outlook open directly; the .ics
 * file covers Apple Calendar (opens straight in Calendar on iPhone) and the rest. */
export function RemindMenu({ reminder, label, className }: { reminder: ReminderInput; label: string; className?: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", close); };
  }, [open]);

  return (
    <div className={`remind ${className ?? ""}`} ref={ref}>
      <button className="btn btn-soft" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((o) => !o)} style={{ width: "100%" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4M12 13v4M10 15h4" /></svg>
        {label}
      </button>
      {open && (
        <div className="menu" role="menu">
          <a role="menuitem" href={googleCalendarUrl(reminder)} target="_blank" rel="noreferrer" onClick={() => setOpen(false)}>
            <span className="menu-dot" style={{ background: "#4285f4" }} aria-hidden="true" />{t("remind.google")}
          </a>
          <a role="menuitem" href={outlookCalendarUrl(reminder)} target="_blank" rel="noreferrer" onClick={() => setOpen(false)}>
            <span className="menu-dot" style={{ background: "#0a64ad" }} aria-hidden="true" />{reminder.seasonal ? t("remind.outlookOnce") : "Outlook"}
          </a>
          <button role="menuitem" onClick={() => { downloadIcs(`streamkeepers-${reminder.siteCode}${reminder.seasonal ? "-seasonal" : ""}.ics`, reminderIcs(reminder)); setOpen(false); }}>
            <span className="menu-dot" style={{ background: "var(--ink-3)" }} aria-hidden="true" />
            <span>{t("remind.ics")}<small>{t("remind.icsHint")}</small></span>
          </button>
        </div>
      )}
    </div>
  );
}
