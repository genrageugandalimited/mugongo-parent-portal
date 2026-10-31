import { describe, expect, it } from "vitest";
import { changePasswordInput, generateStrongPassword, newPasswordSchema, passwordStrength } from "@/lib/password-rules";

describe("new password rules", () => {
  it("rejects the shared starting password 6667", () => {
    expect(newPasswordSchema.safeParse("6667").success).toBe(false);
  });

  it("rejects passwords shorter than 8 characters", () => {
    expect(newPasswordSchema.safeParse("Ab1!xyz").success).toBe(false);
    expect(newPasswordSchema.safeParse("Ab1!xyzq").success).toBe(true);
  });

  it("needs at least three kinds of characters", () => {
    expect(newPasswordSchema.safeParse("tigerlion").success).toBe(false);
    expect(newPasswordSchema.safeParse("tigerlion27").success).toBe(false);
    expect(newPasswordSchema.safeParse("Tigerlion27").success).toBe(true);
  });

  it("rejects easy guesses even when they mix characters", () => {
    for (const weak of ["Password1!", "Abc12345!", "Kpm6667!x", "Aaaa1111!"]) expect(newPasswordSchema.safeParse(weak).success).toBe(false);
  });

  it("requires the new password to differ from the current one", () => {
    expect(changePasswordInput.safeParse({ currentPassword: "Lion2026!z", newPassword: "Lion2026!z" }).success).toBe(false);
    expect(changePasswordInput.safeParse({ currentPassword: "6667", newPassword: "Lion2026!z" }).success).toBe(true);
  });

  it("generates 14-character passwords that pass the rules and rate strong", () => {
    for (let i = 0; i < 50; i++) {
      const password = generateStrongPassword();
      expect(password).toHaveLength(14);
      expect(newPasswordSchema.safeParse(password).success).toBe(true);
      expect(passwordStrength(password).label).toBe("Strong");
    }
  });
});
