import { zodResolver } from "@hookform/resolvers/zod";
import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useChangePassword, useUpdateProfile, useUser } from "@/features/auth/hooks";
import { PasswordToggle } from "@/features/auth/password-toggle";
import { passwordSchema } from "@/features/auth/schemas";
import { useTheme } from "@/features/theme/use-theme";
import { applyFieldErrors, errorMessage } from "@/lib/errors";
import { CURRENCY_LABELS } from "@/lib/money";
import { cn } from "@/lib/utils";
import { CURRENCIES, type ThemePreference } from "@/types/api";

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Configuración" description="Tu perfil, preferencias y seguridad." />
      <div className="grid max-w-3xl gap-6">
        <ProfileCard />
        <PreferencesCard />
        <PasswordCard />
      </div>
    </div>
  );
}

const profileSchema = z.object({
  name: z.string().trim().min(1, "Ingresa tu nombre.").max(100, "Máximo 100 caracteres."),
});

function ProfileCard() {
  const user = useUser();
  const update = useUpdateProfile();
  const { register, handleSubmit, formState, reset, setError } = useForm<
    z.infer<typeof profileSchema>
  >({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user.name },
  });

  useEffect(() => reset({ name: user.name }), [user.name, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await update.mutateAsync({ name: values.name });
      toast.success("Perfil actualizado");
    } catch (error) {
      if (!applyFieldErrors(error, setError, ["name"])) toast.error(errorMessage(error));
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Perfil</CardTitle>
        <CardDescription>Así te saludamos en la aplicación.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
          <FormField id="profile-name" label="Nombre" error={formState.errors.name?.message}>
            {(props) => <Input {...props} {...register("name")} autoComplete="name" />}
          </FormField>
          <FormField id="profile-email" label="Email" description="El email no se puede cambiar.">
            {(props) => <Input {...props} value={user.email} readOnly disabled />}
          </FormField>
          <div className="sm:col-span-2">
            <Button type="submit" loading={update.isPending} disabled={!formState.isDirty}>
              Guardar perfil
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "LIGHT", label: "Claro", icon: Sun },
  { value: "DARK", label: "Oscuro", icon: Moon },
  { value: "SYSTEM", label: "Sistema", icon: Monitor },
];

function supportedTimezones(current: string): string[] {
  let zones: string[];
  try {
    zones = Intl.supportedValuesOf("timeZone");
  } catch {
    zones = ["America/Santiago", "America/Bogota", "America/Mexico_City", "Europe/Madrid", "UTC"];
  }
  return zones.includes(current) ? zones : [current, ...zones];
}

function PreferencesCard() {
  const user = useUser();
  const update = useUpdateProfile();
  const { preference, setPreference } = useTheme();
  const timezones = useMemo(() => supportedTimezones(user.timezone), [user.timezone]);

  const save = async (payload: Parameters<typeof update.mutateAsync>[0], message: string) => {
    try {
      await update.mutateAsync(payload);
      toast.success(message);
    } catch (error) {
      toast.error("No pudimos guardar el cambio", { description: errorMessage(error) });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preferencias</CardTitle>
        <CardDescription>Los cambios se guardan automáticamente.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            id="pref-currency"
            label="Moneda"
            description="Cambia cómo se muestran los montos. No convierte valores."
          >
            {(props) => (
              <Select
                value={user.currency}
                onValueChange={(value) =>
                  void save(
                    { currency: value as (typeof CURRENCIES)[number] },
                    "Moneda actualizada",
                  )
                }
                disabled={update.isPending}
              >
                <SelectTrigger {...props}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      {CURRENCY_LABELS[currency]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormField>
          <FormField
            id="pref-timezone"
            label="Zona horaria"
            description="Define qué es “hoy” y “este mes”."
          >
            {(props) => (
              <Select
                value={user.timezone}
                onValueChange={(value) =>
                  void save({ timezone: value }, "Zona horaria actualizada")
                }
                disabled={update.isPending}
              >
                <SelectTrigger {...props}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timezones.map((zone) => (
                    <SelectItem key={zone} value={zone}>
                      {zone.replaceAll("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormField>
        </div>

        <fieldset>
          <legend className="mb-3 text-sm font-medium">Tema</legend>
          <div className="grid grid-cols-3 gap-2 sm:max-w-md" role="radiogroup" aria-label="Tema">
            {THEME_OPTIONS.map((option) => {
              const selected = preference === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => {
                    setPreference(option.value);
                    void save({ theme: option.value }, "Tema actualizado");
                  }}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border p-3 text-sm transition-colors hover:bg-accent",
                    selected && "border-foreground bg-accent font-medium",
                  )}
                >
                  <option.icon className="size-5" aria-hidden="true" />
                  {option.label}
                </button>
              );
            })}
          </div>
        </fieldset>
      </CardContent>
    </Card>
  );
}

const passwordFormSchema = z
  .object({
    current_password: z.string().min(1, "Ingresa tu contraseña actual."),
    new_password: passwordSchema,
    confirm_password: z.string(),
  })
  .refine((values) => values.new_password === values.confirm_password, {
    path: ["confirm_password"],
    message: "Las contraseñas no coinciden.",
  });
type PasswordValues = z.infer<typeof passwordFormSchema>;

function PasswordCard() {
  const change = useChangePassword();
  const [visible, setVisible] = useState(false);
  const { register, handleSubmit, formState, reset, setError } = useForm<PasswordValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: { current_password: "", new_password: "", confirm_password: "" },
  });

  const onSubmit = handleSubmit(async ({ current_password, new_password }) => {
    try {
      await change.mutateAsync({ current_password, new_password });
      toast.success("Contraseña actualizada", {
        description: "Cerramos tus sesiones en otros dispositivos.",
      });
      reset();
    } catch (error) {
      if (!applyFieldErrors(error, setError, ["current_password", "new_password"])) {
        toast.error(errorMessage(error));
      }
    }
  });

  const type = visible ? "text" : "password";
  return (
    <Card>
      <CardHeader>
        <CardTitle>Seguridad</CardTitle>
        <CardDescription>
          Al cambiar tu contraseña se cerrarán las sesiones abiertas en otros dispositivos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
          <FormField
            id="current-password"
            label="Contraseña actual"
            error={formState.errors.current_password?.message}
            className="sm:col-span-2"
          >
            {(props) => (
              <div className="relative sm:max-w-[calc(50%-0.5rem)]">
                <Input
                  {...props}
                  {...register("current_password")}
                  type={type}
                  autoComplete="current-password"
                  className="pr-10"
                />
                <PasswordToggle visible={visible} onToggle={() => setVisible((v) => !v)} />
              </div>
            )}
          </FormField>
          <FormField
            id="new-password"
            label="Nueva contraseña"
            error={formState.errors.new_password?.message}
            description="Mínimo 8 caracteres, con letras y números."
          >
            {(props) => (
              <Input
                {...props}
                {...register("new_password")}
                type={type}
                autoComplete="new-password"
              />
            )}
          </FormField>
          <FormField
            id="confirm-password"
            label="Confirmar contraseña"
            error={formState.errors.confirm_password?.message}
          >
            {(props) => (
              <Input
                {...props}
                {...register("confirm_password")}
                type={type}
                autoComplete="new-password"
              />
            )}
          </FormField>
          <div className="sm:col-span-2">
            <Button type="submit" loading={change.isPending}>
              Cambiar contraseña
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
