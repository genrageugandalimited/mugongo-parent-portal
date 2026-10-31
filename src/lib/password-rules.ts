import { z } from "zod";

/** The shared password every new school account starts with. */
export const STARTING_PASSWORD = "6667";
export const MIN_PASSWORD_LENGTH = 8;
/** How many of the four character kinds (small, capital, number, symbol) a new password needs. */
export const MIN_CHARACTER_KINDS = 3;
export const GENERATED_PASSWORD_LENGTH = 14;

const COMMON = ["password", "12345678", "123456789", "qwerty", "abc12345", "iloveyou", "kpm12345", "school", "admin", "welcome", "letmein", "football", "monkey", "dragon", "princess", "sunshine"];

export type PasswordCheck = { id: "length" | "lower" | "upper" | "number" | "symbol" | "unusual"; label: string; met: boolean; required: boolean };

/** The hints shown under a new password, each with whether it is already met. */
export function passwordChecks(password: string): PasswordCheck[] {
  return [
    { id: "length", label: `At least ${MIN_PASSWORD_LENGTH} characters (12 or more is even better)`, met: password.length >= MIN_PASSWORD_LENGTH, required: true },
    { id: "lower", label: "A small letter (a–z)", met: /[a-z]/.test(password), required: false },
    { id: "upper", label: "A capital letter (A–Z)", met: /[A-Z]/.test(password), required: false },
    { id: "number", label: "A number (0–9)", met: /[0-9]/.test(password), required: false },
    { id: "symbol", label: "A symbol such as ! @ # ?", met: /[^A-Za-z0-9]/.test(password), required: false },
    { id: "unusual", label: "Not an easy guess like 6667, 12345678, password or aaaa", met: password.length > 0 && !isEasyGuess(password), required: true },
  ];
}

export function characterKinds(password: string) {
  return [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((r) => r.test(password)).length;
}

function isEasyGuess(password: string) {
  const lower = password.toLowerCase();
  if (password === STARTING_PASSWORD || lower.includes(STARTING_PASSWORD)) return true;
  if (/(.)\1{3,}/.test(password)) return true; // aaaa, 1111
  if (/(0123|1234|2345|3456|4567|5678|6789|abcd|bcde|cdef|qwer|asdf)/.test(lower)) return true;
  return COMMON.some((word) => lower.replace(/[^a-z0-9]/g, "").includes(word));
}

/** 0–4 meter: weak, fair, good, strong. */
export function passwordStrength(password: string): { score: 0 | 1 | 2 | 3 | 4; label: string } {
  if (!password) return { score: 0, label: "" };
  if (password.length < MIN_PASSWORD_LENGTH || isEasyGuess(password)) return { score: 1, label: "Weak" };
  const kinds = characterKinds(password);
  if (kinds < MIN_CHARACTER_KINDS) return { score: 2, label: "Fair" };
  if (kinds === 4 && password.length >= 12) return { score: 4, label: "Strong" };
  return { score: 3, label: "Good" };
}

export const newPasswordSchema = z
  .string()
  .max(100, "Use at most 100 characters.")
  .superRefine((p, ctx) => {
    if (p === STARTING_PASSWORD) return ctx.addIssue({ code: "custom", message: "Choose a password other than the starting password 6667." });
    if (p.length < MIN_PASSWORD_LENGTH) return ctx.addIssue({ code: "custom", message: `Use at least ${MIN_PASSWORD_LENGTH} characters.` });
    if (isEasyGuess(p)) return ctx.addIssue({ code: "custom", message: "That password is too easy to guess. Avoid 6667, number runs and common words." });
    if (characterKinds(p) < MIN_CHARACTER_KINDS) ctx.addIssue({ code: "custom", message: "Mix at least three of: small letters, capital letters, numbers and symbols." });
  });

export const changePasswordInput = z
  .object({ currentPassword: z.string().min(1, "Enter your current password.").max(100), newPassword: newPasswordSchema })
  .refine((d) => d.newPassword !== d.currentPassword, { message: "Your new password must be different from your current one.", path: ["newPassword"] });

// Letters and numbers that are easy to tell apart when copied by hand (no 0/O, 1/l/I).
const SETS = ["abcdefghijkmnpqrstuvwxyz", "ABCDEFGHJKLMNPQRSTUVWXYZ", "23456789", "!@#$%?*-+"];

/** A random password with every character kind, from the browser's secure random source. */
export function generateStrongPassword(length = GENERATED_PASSWORD_LENGTH, random: (n: number) => Uint32Array = (n) => crypto.getRandomValues(new Uint32Array(n))) {
  const all = SETS.join("");
  const values = random(length * 2);
  const chars = SETS.map((set, i) => set[values[i] % set.length]);
  for (let i = SETS.length; i < length; i++) chars.push(all[values[i] % all.length]);
  // Shuffle so the guaranteed kinds are not always at the start.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = values[length + i] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  const password = chars.join("");
  return newPasswordSchema.safeParse(password).success ? password : generateStrongPassword(length);
}
