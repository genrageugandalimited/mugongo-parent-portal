import { describe, expect, it } from "vitest";
import { applyServerEnvFallbacks, browserEnvFor, resolveHostEnv } from "@/lib/host-env";
import { isFramedPreviewHost } from "@/lib/auth-session.server";

const secret = "x".repeat(40);

describe("Vercel backend settings", () => {
  it("accepts the names Vercel's database integration creates", () => {
    const env = { SUPABASE_URL: "https://abc.supabase.co/", SUPABASE_ANON_KEY: "anon", SUPABASE_SERVICE_ROLE_KEY: "svc", PUPIL_SESSION_SECRET: secret };
    const resolved = resolveHostEnv(env);
    expect(resolved.missing).toEqual([]);
    expect(browserEnvFor(resolved)).toEqual({ VITE_SUPABASE_URL: "https://abc.supabase.co", VITE_SUPABASE_PUBLISHABLE_KEY: "anon", VITE_SUPABASE_PROJECT_ID: "abc" });
  });

  it("lists every missing setting so the build stops instead of shipping a broken sign-in", () => {
    expect(resolveHostEnv({}).missing).toHaveLength(4);
  });

  it("rejects a session secret shorter than 32 characters", () => {
    const env = { SUPABASE_URL: "https://abc.supabase.co", SUPABASE_ANON_KEY: "a", SUPABASE_SERVICE_ROLE_KEY: "s", PUPIL_SESSION_SECRET: "short" };
    expect(resolveHostEnv(env).missing).toEqual([expect.stringContaining("PUPIL_SESSION_SECRET")]);
  });

  it("fills the server names the app reads from integration aliases", () => {
    const env: Record<string, string | undefined> = { NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co", SUPABASE_ANON_KEY: "anon", SUPABASE_SECRET_KEY: "svc" };
    applyServerEnvFallbacks(env);
    expect([env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, env.SUPABASE_SERVICE_ROLE_KEY]).toEqual(["https://abc.supabase.co", "anon", "svc"]);
  });

  it("uses a cross-site session cookie only inside the Lovable preview", () => {
    expect(isFramedPreviewHost("id-preview--x.lovable.app")).toBe(true);
    expect(isFramedPreviewHost("mugongo-parent-portal.vercel.app")).toBe(false);
  });
});
