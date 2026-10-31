import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";

/**
 * Lovable-hosted sites use Lovable's managed Google broker (/~oauth).
 * Other hosts (e.g. Vercel) have no broker, so they redirect straight to the
 * backend's Google provider. Set VITE_GOOGLE_OAUTH_MODE=direct|lovable to force.
 */
export function usesLovableBroker(hostname = window.location.hostname.toLowerCase()) {
  const mode = import.meta.env.VITE_GOOGLE_OAUTH_MODE as string | undefined;
  if (mode === "direct") return false;
  if (mode === "lovable") return true;
  return /(^|\.)(lovable\.app|lovableproject\.com|lovableproject-dev\.com|lovable\.dev)$/.test(hostname);
}

type Options = { redirectTo: string; params?: Record<string, string> };

/** Returns { redirected } like the Lovable helper; throws on error. */
export async function startGoogleSignIn({ redirectTo, params }: Options) {
  if (usesLovableBroker()) {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: redirectTo, extraParams: params });
    if (result.error) throw result.error;
    return { redirected: !!result.redirected };
  }
  await assertGoogleEnabled();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo, queryParams: params },
  });
  if (error) throw error;
  return { redirected: true };
}

/** Off Lovable, Google must be switched on in the connected backend; say so instead of opening an error page. */
async function assertGoogleEnabled() {
  const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/+$/, "");
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
  if (!url || !key) throw new Error("Google sign-in is not set up for this site yet. Please use your school email.");
  let enabled: boolean | undefined;
  try {
    const response = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } });
    if (response.ok) enabled = (await response.json())?.external?.google === true;
  } catch {
    enabled = undefined; // Network hiccup: let the normal sign-in attempt report it.
  }
  if (enabled === false) throw new Error("Google sign-in is not switched on for this site yet. Please use your school email.");
}

/** Reads an error the backend put on the return address after a failed Google sign-in. */
export function googleReturnError(location: Location = window.location) {
  const params = new URLSearchParams(location.search);
  const hash = new URLSearchParams(location.hash.replace(/^#/, ""));
  const message = params.get("error_description") ?? hash.get("error_description") ?? params.get("error") ?? hash.get("error");
  return message ? message.replace(/\+/g, " ").slice(0, 200) : null;
}
