import { describe, it, expect } from "vitest";
import { usesDirectPortal } from "@/lib/portal-direct";

describe("portal sign-in mode", () => {
  it("uses direct database sign-in on the Vercel site", () => { expect(usesDirectPortal("kpmelections.vercel.app")).toBe(true); });
  it("keeps server sign-in on Lovable hosting", () => { expect(usesDirectPortal("kpm.lovable.app")).toBe(false); });
});
