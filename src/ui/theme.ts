import { useEffect, useState } from "react";

export type Theme = "light" | "dark";
const KEY = "sk.theme.v1";

function initial(): Theme {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch { /* ignore */ }
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Light/dark theme: follows the phone until the user picks one, then remembers it. */
export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(initial);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#101a16" : "#f5f0e6");
  }, [theme]);
  const toggle = () =>
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      try { localStorage.setItem(KEY, next); } catch { /* ignore */ }
      return next;
    });
  return [theme, toggle];
}

/** Online/offline status of the browser. */
export function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    addEventListener("online", on);
    addEventListener("offline", off);
    return () => { removeEventListener("online", on); removeEventListener("offline", off); };
  }, []);
  return online;
}
