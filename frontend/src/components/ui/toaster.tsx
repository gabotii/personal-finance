import { Toaster as Sonner } from "sonner";

import { useTheme } from "@/features/theme/use-theme";

/** Toast host. Toasts are announced politely to screen readers by sonner. */
export function Toaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Sonner
      theme={resolvedTheme}
      position="bottom-right"
      closeButton
      richColors
      duration={3500}
      toastOptions={{
        classNames: {
          toast: "rounded-xl border font-sans shadow-lg",
          title: "text-sm font-medium",
          description: "text-xs",
        },
      }}
    />
  );
}
