import { describe, expect, it } from "vitest";
import { changePasswordInput, newPasswordSchema } from "@/lib/password-rules";

describe("first sign-in password change", () => {
  it("rejects keeping the shared starting password 6667", () => {
    expect(newPasswordSchema.safeParse("6667").success).toBe(false);
  });

  it("rejects passwords shorter than 6 characters", () => {
    expect(newPasswordSchema.safeParse("ab12").success).toBe(false);
    expect(newPasswordSchema.safeParse("ab12cd").success).toBe(true);
  });

  it("requires the new password to differ from the current one", () => {
    expect(changePasswordInput.safeParse({ currentPassword: "lion2026", newPassword: "lion2026" }).success).toBe(false);
    expect(changePasswordInput.safeParse({ currentPassword: "6667", newPassword: "lion2026" }).success).toBe(true);
  });
});
