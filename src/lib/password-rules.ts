import { z } from "zod";

/** The shared password every new school account starts with. */
export const STARTING_PASSWORD = "6667";
export const MIN_PASSWORD_LENGTH = 6;

export const newPasswordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters.`)
  .max(100, "Use at most 100 characters.")
  .refine((p) => p !== STARTING_PASSWORD, "Choose a password other than the starting password 6667.");

export const changePasswordInput = z
  .object({ currentPassword: z.string().min(1, "Enter your current password.").max(100), newPassword: newPasswordSchema })
  .refine((d) => d.newPassword !== d.currentPassword, { message: "Your new password must be different from your current one.", path: ["newPassword"] });
