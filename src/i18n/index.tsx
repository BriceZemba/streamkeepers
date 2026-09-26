// Tiny i18n: dictionaries per language, a context, and helpers for the
// domain's message keys. Domain modules keep English text as the fallback
// (it is also what goes into FHIR), so a missing key never shows a blank.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Msg } from "../domain/missionValue";
import type { Option, Question, Step } from "../domain/checkForm";
import { en } from "./en";
import { pt } from "./pt";
import { fr } from "./fr";

export const LANGS = [
  { code: "en", name: "English", short: "EN" },
  { code: "pt", name: "Português", short: "PT" },
  { code: "fr", name: "Français", short: "FR" },
] as const;
export type Lang = (typeof LANGS)[number]["code"];

const DICTS: Record<Lang, Record<string, string>> = { en, pt, fr };
const KEY = "sk.lang.v1";

function initialLang(): Lang {
  const fromUrl = new URLSearchParams(location.search).get("lang");
  const isLang = (x: string | null): x is Lang => !!x && LANGS.some((l) => l.code === x);
  if (isLang(fromUrl)) return fromUrl;
  try {
    const saved = localStorage.getItem(KEY);
    if (isLang(saved)) return saved;
  } catch { /* ignore */ }
  const nav = navigator.language.slice(0, 2);
  return isLang(nav) ? nav : "en";
}

type Params = Record<string, string | number>;

interface I18n {
  lang: Lang;
  setLang: (l: Lang) => void;
  nextLang: () => void;
  t: (key: string, params?: Params, fallback?: string) => string;
  /** Translate a domain message; `date` params are shown as a localised month. */
  tm: (m: Msg | undefined, fallback: string) => string;
  step: (s: Step) => string;
  q: (q: Question, field: "title" | "term" | "help") => string;
  opt: (q: Question, o: Option, field: "label" | "hint") => string | undefined;
  num: (n: number, digits?: number) => string;
}

const Ctx = createContext<I18n | null>(null);

const optKey = (q: Question, o: Option) =>
  ["YES", "NO"].includes(o.code) && q.options.length === 2 ? `opt.${o.code}` : `opt.${q.id.startsWith("vegetation_") ? "vegetation" : q.id}.${o.code}`;

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  useEffect(() => {
    document.documentElement.lang = lang === "pt" ? "pt-PT" : lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(KEY, l); } catch { /* ignore */ }
  }, []);

  const value = useMemo<I18n>(() => {
    const locale = lang === "pt" ? "pt-PT" : lang === "fr" ? "fr-FR" : "en-GB";
    // Decimal numbers passed as text ("0.78") use the language's separator ("0,78" in pt and fr).
    const local = (v: string | number) => (lang !== "en" && typeof v === "string" && /^-?\d+\.\d+$/.test(v) ? v.replace(".", ",") : String(v));
    const fill = (text: string, params?: Params) =>
      params ? text.replace(/\{(\w+)\}/g, (_, k) => (params[k] !== undefined ? local(params[k]) : `{${k}}`)) : text;
    const t = (key: string, params?: Params, fallback?: string) => fill(DICTS[lang][key] ?? en[key] ?? fallback ?? key, params);
    const monthYear = (iso: string) => new Date(iso + "T00:00:00Z").toLocaleDateString(locale, { month: "short", year: "numeric", timeZone: "UTC" });
    return {
      lang,
      setLang,
      nextLang: () => setLang(LANGS[(LANGS.findIndex((l) => l.code === lang) + 1) % LANGS.length].code),
      t,
      tm: (m, fallback) => {
        if (!m) return fallback;
        const params = m.params ? { ...m.params } : undefined;
        if (params?.date) params.date = monthYear(String(params.date));
        return t(m.key, params, fallback);
      },
      step: (s) => t(`step.${s.id}`, undefined, s.title),
      q: (q, field) => t(`q.${q.id}.${field}`, undefined, q[field]),
      opt: (q, o, field) => {
        const base = field === "label" ? o.label : o.hint;
        if (base === undefined) return undefined;
        return t(`${optKey(q, o)}.${field}`, undefined, base);
      },
      num: (n, digits = 0) => n.toLocaleString(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits }),
    };
  }, [lang, setLang]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18n {
  const v = useContext(Ctx);
  if (!v) throw new Error("useI18n outside I18nProvider");
  return v;
}
