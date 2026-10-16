import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { THEMES, type ThemePreference } from "@/types/api";

import { THEME_STORAGE_KEY, ThemeContext, type ResolvedTheme } from "./theme-context";

const DARK_QUERY = "(prefers-color-scheme: dark)";

function readStoredPreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return (THEMES as readonly string[]).includes(stored ?? "")
      ? (stored as ThemePreference)
      : "SYSTEM";
  } catch {
    return "SYSTEM";
  }
}

function systemTheme(): ResolvedTheme {
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

/**
 * Light / dark / system theme. The preference is mirrored to localStorage only so the
 * correct theme is applied before React loads (public/theme-init.js); the source of truth
 * for signed-in users is their server-side preference (synced in AppLayout).
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readStoredPreference);
  const [system, setSystem] = useState<ResolvedTheme>(systemTheme);

  useEffect(() => {
    const media = window.matchMedia(DARK_QUERY);
    const listener = () => setSystem(media.matches ? "dark" : "light");
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  const resolvedTheme: ResolvedTheme =
    preference === "SYSTEM" ? system : preference === "DARK" ? "dark" : "light";

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", resolvedTheme === "dark");
    root.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage may be unavailable (private mode); the in-memory preference still applies.
    }
  }, []);

  const value = useMemo(
    () => ({ preference, resolvedTheme, setPreference }),
    [preference, resolvedTheme, setPreference],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
