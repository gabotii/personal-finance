import { useMemo } from "react";

import { useTheme } from "@/features/theme/use-theme";

export interface ChartTheme {
  income: string;
  expense: string;
  net: string;
  grid: string;
  axis: string;
  surface: string;
  muted: string;
}

function token(styles: CSSStyleDeclaration, name: string): string {
  const value = styles.getPropertyValue(`--${name}`).trim();
  return value ? `hsl(${value})` : "currentColor";
}

/**
 * Resolves the chart colour tokens for the active theme. SVG presentation attributes
 * cannot reliably use CSS var(), so colours are read once per theme change.
 */
export function useChartTheme(): ChartTheme {
  const { resolvedTheme } = useTheme();
  return useMemo(() => {
    // `resolvedTheme` is a dependency on purpose: the variables change with the theme class.
    void resolvedTheme;
    const styles = getComputedStyle(document.documentElement);
    return {
      income: token(styles, "income"),
      expense: token(styles, "expense"),
      net: token(styles, "net"),
      grid: token(styles, "border"),
      axis: token(styles, "muted-foreground"),
      surface: token(styles, "card"),
      muted: token(styles, "muted"),
    };
  }, [resolvedTheme]);
}
