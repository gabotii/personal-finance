import { z } from "zod";

// Mirrors backend validation (app/schemas/validators.py) for instant feedback.
export const passwordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres.")
  .max(128, "La contraseña no puede superar 128 caracteres.")
  .refine(
    (value) => /\p{L}/u.test(value) && /\d/.test(value),
    "La contraseña debe incluir al menos una letra y un número.",
  );

const emailSchema = z.string().trim().min(1, "Ingresa tu email.").email("Ingresa un email válido.");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Ingresa tu contraseña."),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Ingresa tu nombre.").max(100, "Máximo 100 caracteres."),
  email: emailSchema,
  password: passwordSchema,
});
export type RegisterValues = z.infer<typeof registerSchema>;
