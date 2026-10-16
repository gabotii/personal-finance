import * as DialogPrimitive from "@radix-ui/react-dialog";
import { LogOut, Menu, Monitor, Moon, Plus, Settings, Sun, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { toast } from "sonner";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLogout, useUpdateProfile, useUser } from "@/features/auth/hooks";
import { useTheme } from "@/features/theme/use-theme";
import { useTransactionDialog } from "@/features/transactions/transaction-dialog-context";
import { TransactionDialogProvider } from "@/features/transactions/transaction-dialog-provider";
import { errorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import type { ThemePreference } from "@/types/api";

import { NAV_ITEMS } from "./navigation";

export function AppLayout() {
  const user = useUser();
  const { setPreference } = useTheme();

  // The server-side preference wins across devices.
  useEffect(() => {
    setPreference(user.theme);
  }, [user.theme, setPreference]);

  return (
    <TransactionDialogProvider>
      <a
        href="#main-content"
        className="sr-only z-[60] rounded-lg bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Saltar al contenido
      </a>
      <div className="flex min-h-dvh">
        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r bg-card/60 px-3 py-5 lg:flex">
          <Link to="/" className="mb-8 px-3" aria-label="Finanzas, ir al dashboard">
            <Logo />
          </Link>
          <SidebarNav />
          <div className="mt-auto px-3 text-xs text-muted-foreground">
            Presiona <kbd className="rounded border px-1 font-sans">N</kbd> para un nuevo movimiento
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <Header />
          <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
            <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </TransactionDialogProvider>
  );
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Navegación principal">
      <ul className="space-y-1">
        {NAV_ITEMS.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                  isActive && "bg-accent text-foreground",
                )
              }
            >
              <item.icon className="size-4 shrink-0" aria-hidden="true" />
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function Header() {
  const user = useUser();
  const { openCreate } = useTransactionDialog();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const [drawerPath, setDrawerPath] = useState(location.pathname);
  if (drawerPath !== location.pathname) {
    setDrawerPath(location.pathname);
    setDrawerOpen(false);
  }
  const firstName = user.name.split(" ")[0] ?? user.name;

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 sm:px-6 lg:px-8">
        <DialogPrimitive.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DialogPrimitive.Trigger asChild>
            <Button variant="ghost" size="icon" className="-ml-2 lg:hidden" aria-label="Abrir menú">
              <Menu className="!size-5" aria-hidden="true" />
            </Button>
          </DialogPrimitive.Trigger>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 lg:hidden" />
            <DialogPrimitive.Content className="fixed inset-y-0 left-0 z-50 flex w-[min(18rem,85vw)] flex-col border-r bg-card px-3 py-5 shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left lg:hidden">
              <div className="mb-6 flex items-center justify-between px-3">
                <DialogPrimitive.Title asChild>
                  <span>
                    <Logo />
                  </span>
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="sr-only">
                  Navegación de la aplicación
                </DialogPrimitive.Description>
                <DialogPrimitive.Close asChild>
                  <Button variant="ghost" size="icon-sm" aria-label="Cerrar menú">
                    <X aria-hidden="true" />
                  </Button>
                </DialogPrimitive.Close>
              </div>
              <SidebarNav onNavigate={() => setDrawerOpen(false)} />
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>

        <Link to="/" className="lg:hidden" aria-label="Finanzas, ir al dashboard">
          <Logo />
        </Link>
        <p className="hidden text-sm text-muted-foreground lg:block">
          Hola, <span className="font-medium text-foreground">{firstName}</span>
        </p>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <Button onClick={() => openCreate()} className="hidden sm:inline-flex">
            <Plus aria-hidden="true" />
            Nuevo movimiento
          </Button>
          <Button
            onClick={() => openCreate()}
            size="icon"
            className="sm:hidden"
            aria-label="Nuevo movimiento"
          >
            <Plus aria-hidden="true" />
          </Button>
          <ThemeMenu />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "LIGHT", label: "Claro", icon: Sun },
  { value: "DARK", label: "Oscuro", icon: Moon },
  { value: "SYSTEM", label: "Sistema", icon: Monitor },
];

function ThemeMenu() {
  const { preference, resolvedTheme, setPreference } = useTheme();
  const updateProfile = useUpdateProfile();
  const CurrentIcon = resolvedTheme === "dark" ? Moon : Sun;

  const choose = (theme: ThemePreference) => {
    setPreference(theme);
    updateProfile.mutate(
      { theme },
      {
        onError: (error) =>
          toast.error("No pudimos guardar tu preferencia", { description: errorMessage(error) }),
      },
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Cambiar tema">
          <CurrentIcon aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Tema</DropdownMenuLabel>
        {THEME_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onSelect={() => choose(option.value)}
            aria-current={preference === option.value ? "true" : undefined}
            className={cn(preference === option.value && "font-semibold")}
          >
            <option.icon aria-hidden="true" />
            {option.label}
            {preference === option.value && <span className="ml-auto text-xs">Actual</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function UserMenu() {
  const user = useUser();
  const logout = useLogout();
  const navigate = useNavigate();
  const initials = user.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSettled: () => {
        toast.success("Sesión cerrada");
        void navigate("/login", { replace: true });
      },
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full" aria-label="Menú de usuario">
          <span className="grid size-8 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {initials || "?"}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-60">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
          <p className="truncate text-xs">{user.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void navigate("/settings")}>
          <Settings aria-hidden="true" />
          Configuración
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={handleLogout} disabled={logout.isPending}>
          <LogOut aria-hidden="true" />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
