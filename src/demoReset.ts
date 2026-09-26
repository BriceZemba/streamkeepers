// `?demo-reset` puts this browser in the known starting state used to film the demo:
// no checks, drafts, proposed streams or adopted stream; English, light theme, Plan map;
// practice mode and the labelled simulated activity on; welcome already seen.
// It only resets settings and deletes local data; it never creates checks.
// It asks first, since it deletes the checks stored in this browser.

const SET: Record<string, string> = {
  "sk.lang.v1": "en",
  "sk.theme.v1": "light",
  "sk.mapview.v1": "plan",
  "sk.welcome.v1": "1",
  "sk.reviewer.v1": "Coimbra team",
  "sk.settings.v2": JSON.stringify({ practice: true, simulated: true, server: "oah" }),
};

export function applyDemoReset(): void {
  const url = new URL(location.href);
  if (!url.searchParams.has("demo-reset")) return;
  url.searchParams.delete("demo-reset");
  url.searchParams.set("practice", "1");
  url.searchParams.delete("lang");
  const ok = window.confirm(
    "Reset StreamKeepers in this browser for the demo recording?\n\nThis deletes the checks, drafts and proposed streams stored here (copies already on a FHIR server stay there).",
  );
  if (ok) {
    try {
      for (const k of Object.keys(localStorage)) if (k.startsWith("sk.")) localStorage.removeItem(k);
      for (const [k, v] of Object.entries(SET)) localStorage.setItem(k, v);
    } catch { /* storage blocked: nothing to reset */ }
  }
  history.replaceState(null, "", url.pathname + url.search + url.hash);
}
