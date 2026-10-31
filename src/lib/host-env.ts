/**
 * Resolves backend settings on hosts other than Lovable (e.g. Vercel), where the
 * database integration may name variables differently (SUPABASE_ANON_KEY,
 * NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY…). Dependency-free so both
 * vite.config.ts (build) and src/server.ts (runtime) can use it.
 */
type Env = Record<string, string | undefined>;

const URL_KEYS = ["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL", "VITE_SUPABASE_URL"];
const PUBLISHABLE_KEYS = [
  "SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
];
const SERVICE_KEYS = ["SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY"];
/** Encrypted session cookies need a password of at least 32 characters. */
export const MIN_SESSION_SECRET_LENGTH = 32;

function first(env: Env, keys: string[]) {
  for (const key of keys) {
    const value = env[key]?.trim();
    if (value) return value;
  }
  return undefined;
}

export function projectIdFromUrl(url: string) {
  try {
    return new URL(url).hostname.split(".")[0] || undefined;
  } catch {
    return undefined;
  }
}

export function resolveHostEnv(env: Env) {
  const url = first(env, URL_KEYS)?.replace(/\/+$/, "");
  const publishableKey = first(env, PUBLISHABLE_KEYS);
  const serviceRoleKey = first(env, SERVICE_KEYS);
  const sessionSecret = env.PUPIL_SESSION_SECRET?.trim();
  const missing: string[] = [];
  if (!url) missing.push("SUPABASE_URL");
  if (!publishableKey) missing.push("SUPABASE_ANON_KEY (or SUPABASE_PUBLISHABLE_KEY)");
  if (!serviceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!sessionSecret || sessionSecret.length < MIN_SESSION_SECRET_LENGTH) {
    missing.push(`PUPIL_SESSION_SECRET (random text, at least ${MIN_SESSION_SECRET_LENGTH} characters)`);
  }
  return { url, publishableKey, serviceRoleKey, sessionSecret, projectId: url ? projectIdFromUrl(url) : undefined, missing };
}

/** Browser settings for the build, always pointing at the same backend the server uses. */
export function browserEnvFor(resolved: ReturnType<typeof resolveHostEnv>): Record<string, string> {
  const out: Record<string, string> = {};
  if (resolved.url) out.VITE_SUPABASE_URL = resolved.url;
  if (resolved.publishableKey) out.VITE_SUPABASE_PUBLISHABLE_KEY = resolved.publishableKey;
  if (resolved.projectId) out.VITE_SUPABASE_PROJECT_ID = resolved.projectId;
  return out;
}

/** Fills the server variable names the app reads when the host only set an alias. */
export function applyServerEnvFallbacks(env: Env) {
  const resolved = resolveHostEnv(env);
  if (!env.SUPABASE_URL && resolved.url) env.SUPABASE_URL = resolved.url;
  if (!env.SUPABASE_PUBLISHABLE_KEY && resolved.publishableKey) env.SUPABASE_PUBLISHABLE_KEY = resolved.publishableKey;
  if (!env.SUPABASE_SERVICE_ROLE_KEY && resolved.serviceRoleKey) env.SUPABASE_SERVICE_ROLE_KEY = resolved.serviceRoleKey;
  return env;
}
