// Phone-sized screenshots of the live app for the README (docs/img/).
// Uses the locally installed Chrome. Usage: npm run screenshots [-- <base-url>]
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import puppeteer, { type Page } from "puppeteer-core";

const BASE = process.argv[2] ?? "https://streamkeepers.vercel.app";
const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const OUT = join(import.meta.dirname, "..", "docs", "img");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fresh(page: Page, query: string, prefs: Record<string, string>) {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.evaluate((p) => {
    localStorage.clear();
    for (const [k, v] of Object.entries(p)) localStorage.setItem(k, v);
  }, prefs);
  await page.goto(`${BASE}/${query}`, { waitUntil: "networkidle2" });
  await sleep(1500);
}

const clickText = (page: Page, selector: string, text: string) =>
  page.evaluate((sel, txt) => {
    const el = [...document.querySelectorAll<HTMLElement>(sel)].find((e) => e.textContent?.includes(txt));
    if (!el) throw new Error(`not found: ${txt}`);
    el.click();
  }, selector, text);

async function shot(page: Page, name: string) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(600);
  await page.screenshot({ path: join(OUT, `${name}.png`) as `${string}.png` });
  console.log("saved", name);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const light = { "sk.theme.v1": "light", "sk.mapview.v1": "plan" };

  // 1. Missions: the busy park vs the forgotten stream
  await fresh(page, "?lang=en", light);
  await page.evaluate(() => document.querySelector(".sheet")?.scrollIntoView());
  await sleep(500);
  await page.screenshot({ path: join(OUT, "1-missions.png") as `${string}.png` });
  console.log("saved 1-missions");

  // 2. Mission detail with the points ledger
  await fresh(page, "?lang=en&site=C5", light);
  await page.evaluate(() => document.querySelector(".ledger")?.scrollIntoView({ block: "center" }));
  await sleep(700);
  await page.screenshot({ path: join(OUT, "2-mission.png") as `${string}.png` });
  console.log("saved 2-mission");

  // 3. A step of the guided check (pictograms + plain language)
  await fresh(page, "?lang=en&site=C5&practice=1", light);
  await clickText(page, ".btn-primary", "Start the stream check");
  await sleep(500);
  await page.evaluate(() => (document.querySelectorAll(".opt")[1] as HTMLElement).click());
  await clickText(page, ".dock .btn-primary", "Continue");
  await sleep(300);
  await page.evaluate(() => (document.querySelectorAll(".opt")[0] as HTMLElement).click());
  await clickText(page, ".dock .btn-primary", "Continue");
  await sleep(300);
  await page.evaluate(() => (document.querySelectorAll(".opt")[0] as HTMLElement).click());
  await shot(page, "3-check");

  // 4. Quality gate: a 20-second "everything is polluted" rush is held for review
  for (let i = 0; i < 10; i++) {
    const done = await page.evaluate(() => {
      if (document.querySelector("#step-h")?.textContent?.startsWith("Check your answers")) return true;
      for (const fs of document.querySelectorAll("fieldset.question")) {
        if (fs.querySelector('[aria-pressed="true"]')) continue;
        const opts = [...fs.querySelectorAll<HTMLElement>(".opt")];
        (opts.find((o) => /Foam|Unusual|water coming out|^Yes|Built|Most|Poor/.test(o.innerText)) ?? opts[0]).click();
      }
      (document.querySelector(".dock .btn-primary") as HTMLElement).click();
      return false;
    });
    if (done) break;
    await sleep(250);
  }
  await clickText(page, ".dock .btn-primary", "Send my check");
  await sleep(9000);
  await shot(page, "4-held");

  // 5. 3D terrain, dark theme (Coimbra valleys)
  await fresh(page, "?lang=pt", { "sk.theme.v1": "dark", "sk.mapview.v1": "3d" });
  await sleep(9000);
  await shot(page, "5-3d-pt-dark");

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
