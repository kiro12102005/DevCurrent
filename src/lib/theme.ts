"use client";

import { useEffect, useState } from "react";

export type ThemeMode = "system" | "light" | "dark";

const STORAGE_KEY = "theme_mode";

// Kept in sync with the inline script in layout.tsx (THEME_INIT_SCRIPT) -
// that script runs before hydration to avoid a flash of the wrong theme,
// this function is what re-applies it on every subsequent change.
export function applyTheme(mode: ThemeMode) {
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = mode === "dark" || (mode === "system" && systemDark);
  document.documentElement.classList.toggle("dark", dark);
}

export function useTheme() {
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      const stored = window.localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
      setModeState(stored ?? "system");
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!loaded) return;
    applyTheme(mode);
    if (mode !== "system") return;
    // Live-follow the OS setting while in "system" mode.
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => applyTheme(mode);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [mode, loaded]);

  function setMode(next: ThemeMode) {
    window.localStorage.setItem(STORAGE_KEY, next);
    setModeState(next);
  }

  return { mode, setMode, loaded };
}

// Injected verbatim into a <script> tag in layout.tsx so the .dark class is
// applied before first paint (no flash of light theme for dark-mode users).
export const THEME_INIT_SCRIPT = `(function(){try{var m=localStorage.getItem("${STORAGE_KEY}");var d=m==="dark"||((!m||m==="system")&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(d)document.documentElement.classList.add("dark");}catch(e){}})();`;
