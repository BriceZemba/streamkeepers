// Calendar reminders (.ics). They work on every phone without a server, an
// account or a notification permission, and link straight back to the mission.

export interface ReminderInput {
  siteCode: string;
  siteName: string;
  lat: number;
  lon: number;
  /** Link that opens the mission in the app. */
  url: string;
  title: string;
  description: string;
  /** Repeat every season (3 months) for an adopted stream; otherwise a single reminder. */
  seasonal: boolean;
  now: Date;
}

/** Next Saturday at 10:00 local time (at least one day ahead). */
export function nextSaturdayMorning(now: Date): Date {
  const d = new Date(now);
  d.setHours(10, 0, 0, 0);
  const add = (6 - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + add);
  return d;
}

const pad = (n: number) => String(n).padStart(2, "0");
/** Floating local time: the reminder fires at 10:00 wherever the volunteer is. */
const localStamp = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
const utcStamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** RFC 5545 text escaping and 75-octet line folding. */
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out: string[] = [];
  let cur = "";
  for (const ch of line) {
    if (new TextEncoder().encode(cur + ch).length > (out.length ? 74 : 75)) {
      out.push(cur);
      cur = ch;
    } else cur += ch;
  }
  out.push(cur);
  return out.join("\r\n ");
}

export function reminderIcs(r: ReminderInput): string {
  const start = nextSaturdayMorning(r.now);
  const end = new Date(start.getTime() + 30 * 60_000);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//StreamKeepers//OneAquaHealth hackathon prototype//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:streamkeepers-${r.siteCode}-${r.seasonal ? "seasonal" : utcStamp(r.now)}@streamkeepers`,
    `DTSTAMP:${utcStamp(r.now)}`,
    `DTSTART:${localStamp(start)}`,
    `DTEND:${localStamp(end)}`,
    ...(r.seasonal ? ["RRULE:FREQ=MONTHLY;INTERVAL=3;COUNT=8"] : []),
    `SUMMARY:${esc(r.title)}`,
    `DESCRIPTION:${esc(`${r.description}\n${r.url}`)}`,
    `LOCATION:${esc(r.siteName)}`,
    `GEO:${r.lat.toFixed(6)};${r.lon.toFixed(6)}`,
    `URL:${r.url}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(r.title)}`,
    "TRIGGER:-PT1H",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}

/** Link that opens a site's mission, keeping the language. */
export function missionLink(base: string, siteCode: string, lang: string): string {
  const u = new URL(base);
  u.search = "";
  u.hash = "";
  u.searchParams.set("site", siteCode);
  u.searchParams.set("lang", lang);
  return u.toString();
}

const isoLocal = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;

/** Google Calendar "create event" link (opens the app or web calendar, no file). */
export function googleCalendarUrl(r: ReminderInput): string {
  const start = nextSaturdayMorning(r.now);
  const end = new Date(start.getTime() + 30 * 60_000);
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: r.title,
    dates: `${localStamp(start)}/${localStamp(end)}`,
    details: `${r.description}
${r.url}`,
    location: `${r.siteName} (${r.lat.toFixed(5)}, ${r.lon.toFixed(5)})`,
  });
  if (r.seasonal) p.set("recur", "RRULE:FREQ=MONTHLY;INTERVAL=3;COUNT=8");
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

/** Outlook.com "compose event" link. Outlook links can't carry a repeat rule. */
export function outlookCalendarUrl(r: ReminderInput): string {
  const start = nextSaturdayMorning(r.now);
  const end = new Date(start.getTime() + 30 * 60_000);
  const p = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: r.title,
    startdt: isoLocal(start),
    enddt: isoLocal(end),
    body: `${r.description}
${r.url}`,
    location: r.siteName,
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${p.toString()}`;
}
