import { createContext } from "react";

import type { ThemePreference } from "@/types/api";

export type ResolvedTheme = "light" | "dark";

export interface ThemeContextValue {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export const THEME_STORAGE_KEY = "pf-theme";
