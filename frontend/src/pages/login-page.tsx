import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { useLogin } from "@/features/auth/hooks";
import { PasswordToggle } from "@/features/auth/password-toggle";
import { loginSchema, type LoginValues } from "@/features/auth/schemas";
import { errorMessage } from "@/lib/errors";

export function LoginPage() {
  const login = useLogin();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const from = (location.state as { from?: string } | null)?.from ?? "/";

  const { register, handleSubmit, formState } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit((values) => {
    login.mutate(values, {
      onSuccess: () => void navigate(from.startsWith("/") ? from : "/", { replace: true }),
    });
  });

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Inicia sesión</h1>
        <p className="text-sm text-muted-foreground">Bienvenido de vuelta. Ingresa tus datos.</p>
      </div>

      <form onSubmit={onSubmit} noValidate className="grid gap-5">
        {login.isError && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
          >
            {errorMessage(login.error)}
          </div>
        )}
        <FormField id="login-email" label="Email" error={formState.errors.email?.message}>
          {(props) => (
            <Input
              {...props}
              {...register("email")}
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="tu@email.com"
              autoFocus
            />
          )}
        </FormField>
        <FormField
          id="login-password"
          label="Contraseña"
          error={formState.errors.password?.message}
        >
          {(props) => (
            <div className="relative">
              <Input
                {...props}
                {...register("password")}
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                className="pr-10"
              />
              <PasswordToggle visible={showPassword} onToggle={() => setShowPassword((v) => !v)} />
            </div>
          )}
        </FormField>
        <Button type="submit" size="lg" loading={login.isPending} className="w-full">
          Iniciar sesión
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        ¿No tienes cuenta?{" "}
        <Link
          to="/register"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Crea una gratis
        </Link>
      </p>
    </div>
  );
}
