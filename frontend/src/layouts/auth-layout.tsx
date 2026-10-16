import { ChartPie, FileSpreadsheet, ShieldCheck } from "lucide-react";
import { Outlet } from "react-router";

import { Logo } from "@/components/logo";

const HIGHLIGHTS = [
  { icon: ChartPie, text: "Entiende en qué gastas con gráficos claros por categoría y mes." },
  { icon: FileSpreadsheet, text: "Exporta tus movimientos a Excel o CSV cuando lo necesites." },
  { icon: ShieldCheck, text: "Tus datos son privados: solo tú puedes verlos." },
];

export function AuthLayout() {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(0,560px)]">
      <section
        aria-hidden="true"
        className="relative hidden overflow-hidden border-r bg-card lg:flex lg:flex-col lg:justify-between lg:p-12"
      >
        <Logo />
        <div className="max-w-md space-y-8">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight">
            Tus finanzas personales, ordenadas y a la vista.
          </h2>
          <ul className="space-y-4">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-sm text-muted-foreground">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg border bg-background">
                  <Icon className="size-4 text-foreground" />
                </span>
                <span className="pt-1.5">{text}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Finanzas Personales
        </p>
      </section>

      <main className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm animate-fade-up">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
