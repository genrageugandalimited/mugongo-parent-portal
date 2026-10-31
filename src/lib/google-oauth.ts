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
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo, queryParams: params },
  });
  if (error) throw error;
  return { redirected: true };
}

/** Reads an error the backend put on the return address after a failed Google sign-in. */
export function googleReturnError(location: Location = window.location) {
  const params = new URLSearchParams(location.search);
  const hash = new URLSearchParams(location.hash.replace(/^#/, ""));
  const message = params.get("error_description") ?? hash.get("error_description") ?? params.get("error") ?? hash.get("error");
  return message ? message.replace(/\+/g, " ").slice(0, 200) : null;
}
