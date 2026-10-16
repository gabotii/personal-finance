import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { useRegister } from "@/features/auth/hooks";
import { PasswordToggle } from "@/features/auth/password-toggle";
import { registerSchema, type RegisterValues } from "@/features/auth/schemas";
import { applyFieldErrors, errorMessage } from "@/lib/errors";

function browserTimezone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}

export function RegisterPage() {
  const registerMutation = useRegister();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState, setError } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await registerMutation.mutateAsync({ ...values, timezone: browserTimezone() });
      toast.success("¡Cuenta creada!", {
        description: "Ya puedes registrar tu primer movimiento.",
      });
      void navigate("/", { replace: true });
    } catch (error) {
      if (!applyFieldErrors(error, setError, ["name", "email", "password"])) {
        toast.error(errorMessage(error));
      }
    }
  });

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Crea tu cuenta</h1>
        <p className="text-sm text-muted-foreground">
          Empieza a controlar tus ingresos y gastos en minutos.
        </p>
      </div>

      <form onSubmit={onSubmit} noValidate className="grid gap-5">
        <FormField id="register-name" label="Nombre" error={formState.errors.name?.message}>
          {(props) => (
            <Input
              {...props}
              {...register("name")}
              autoComplete="name"
              placeholder="Tu nombre"
              autoFocus
            />
          )}
        </FormField>
        <FormField id="register-email" label="Email" error={formState.errors.email?.message}>
          {(props) => (
            <Input
              {...props}
              {...register("email")}
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="tu@email.com"
            />
          )}
        </FormField>
        <FormField
          id="register-password"
          label="Contraseña"
          error={formState.errors.password?.message}
          description="Mínimo 8 caracteres, con al menos una letra y un número."
        >
          {(props) => (
            <div className="relative">
              <Input
                {...props}
                {...register("password")}
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                className="pr-10"
              />
              <PasswordToggle visible={showPassword} onToggle={() => setShowPassword((v) => !v)} />
            </div>
          )}
        </FormField>
        <Button type="submit" size="lg" loading={registerMutation.isPending} className="w-full">
          Crear cuenta
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{" "}
        <Link
          to="/login"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
