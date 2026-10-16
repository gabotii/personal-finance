import { Eye, EyeOff } from "lucide-react";

export function PasswordToggle({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:text-foreground"
      aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
      aria-pressed={visible}
    >
      {visible ? (
        <EyeOff className="size-4" aria-hidden="true" />
      ) : (
        <Eye className="size-4" aria-hidden="true" />
      )}
    </button>
  );
}
