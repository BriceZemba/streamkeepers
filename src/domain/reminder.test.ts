import { describe, expect, it } from "vitest";
import { missionLink, nextSaturdayMorning, reminderIcs } from "./reminder";

const base = {
  siteCode: "C5", siteName: "Mina Hospital", lat: 40.2186, lon: -8.42733,
  url: "https://example.org/?site=C5&lang=pt", title: "StreamKeepers: check Mina Hospital",
  description: "Your adopted stream, worth 131 points; thanks, Ana", now: new Date(2026, 8, 24, 9, 0),
};

describe("calendar reminder", () => {
  it("schedules the next Saturday at 10:00, never today", () => {
    const d = nextSaturdayMorning(new Date(2026, 8, 24, 9, 0)); // Thursday
    expect([d.getDay(), d.getDate(), d.getHours()]).toEqual([6, 26, 10]);
    expect(nextSaturdayMorning(new Date(2026, 8, 26, 8, 0)).getDate()).toBe(3); // on a Saturday -> next week
  });

  it("repeats every season only for an adopted stream", () => {
    expect(reminderIcs({ ...base, seasonal: true })).toContain("RRULE:FREQ=MONTHLY;INTERVAL=3;COUNT=8");
    expect(reminderIcs({ ...base, seasonal: false })).not.toContain("RRULE");
  });

  it("is valid iCalendar: CRLF lines, escaped text, folded long lines, alarm, link back", () => {
    const ics = reminderIcs({ ...base, seasonal: true, description: "x".repeat(200) + ", end" });
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("DTSTART:20260926T100000");
    expect(ics).toContain("TRIGGER:-PT1H");
    expect(ics).toContain("URL:https://example.org/?site=C5&lang=pt");
    expect(ics).toContain("\\, end");
    for (const line of ics.split("\r\n")) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });

  it("builds a mission link that keeps the language and drops other parameters", () => {
    expect(missionLink("https://sk.app/?practice=1#x", "C5", "pt")).toBe("https://sk.app/?site=C5&lang=pt");
  });
});
