/** Save an .ics file; phones open it straight in the calendar app. */
export function downloadIcs(filename: string, ics: string) {
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Native share sheet where available, clipboard otherwise. */
export async function shareLink(data: { title: string; text: string; url: string }): Promise<"shared" | "copied" | "failed"> {
  try {
    if (navigator.share) {
      await navigator.share(data);
      return "shared";
    }
    await navigator.clipboard.writeText(`${data.text} ${data.url}`);
    return "copied";
  } catch (e) {
    return (e as Error).name === "AbortError" ? "shared" : "failed";
  }
}
