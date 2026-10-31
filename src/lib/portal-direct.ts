import { supabase } from "@/integrations/supabase/client";

/**
 * Lovable-hosted sites use server functions with an encrypted cookie.
 * Other hosts (e.g. Vercel) have no server secrets, so sign-in and elections call
 * database functions directly; the database checks a random session token.
 * Set VITE_PORTAL_MODE=direct|server to force.
 */
export function usesDirectPortal(hostname = typeof window === "undefined" ? "" : window.location.hostname.toLowerCase()) {
  const mode = import.meta.env.VITE_PORTAL_MODE as string | undefined;
  if (mode === "direct") return true;
  if (mode === "server") return false;
  if (!hostname || hostname === "localhost" || hostname === "127.0.0.1") return false;
  return !/(^|\.)(lovable\.app|lovableproject\.com|lovableproject-dev\.com|lovable\.dev)$/.test(hostname);
}

const KEY = "kpm-portal-token";
const token = () => localStorage.getItem(KEY) ?? "";
const rpc = supabase.rpc.bind(supabase) as unknown as (name: string, args: Record<string, unknown>) => Promise<{ data: any; error: { message: string } | null }>;

type Account = { id: string; role: "student" | "teacher" | "admin"; name: string; email: string; is_verified?: boolean; photo_url?: string | null; personal_email?: string | null; must_change_password?: boolean };
const photo = (p?: string | null) => (p && /^(https?:|data:)/.test(p) ? p : null);

export async function directLogin(email: string, password: string) {
  const { data, error } = await rpc("verify_portal_login", { p_email: email, p_password: password });
  if (error) throw new Error("Sign-in is temporarily unavailable.");
  if (!data?.success) return { success: false as const, message: (data?.message as string) || "Invalid email or password" };
  localStorage.setItem(KEY, data.session_token);
  const a = data.account as Account;
  return { success: true as const, role: a.role, name: a.name, email: a.email, token: crypto.randomUUID(), is_verified: !!a.is_verified, user_id: a.id, student_id: a.role === "student" ? a.id : undefined, photo_url: photo(a.photo_url), personal_email: a.personal_email ?? null, must_change_password: !!a.must_change_password };
}

export async function directSession() {
  if (!token()) return null;
  const { data, error } = await rpc("portal_me", { p_token: token() });
  if (error || !data) return null;
  const a = data as Account;
  return { role: a.role, id: a.id, name: a.name, email: a.email, photo_url: photo(a.photo_url), is_verified: !!a.is_verified, personal_email: a.personal_email ?? null, must_change_password: !!a.must_change_password };
}

export async function directLogout() {
  const t = token();
  localStorage.removeItem(KEY);
  if (t) await rpc("portal_logout", { p_token: t });
}

export async function directChangePassword(currentPassword: string, newPassword: string) {
  const { data, error } = await rpc("portal_change_password", { p_token: token(), p_current: currentPassword, p_new: newPassword });
  if (error) throw new Error(error.message);
  return data as { success: boolean; message?: string };
}

export async function directElection(req: Record<string, unknown>) {
  const { data, error } = await rpc("portal_election", { p_token: token(), p_req: req });
  if (error) return { data: null, error: { message: error.message } };
  return { data: data?.data ?? null, error: null };
}

export async function directElectionRpc(name: string, args?: Record<string, unknown>) {
  const { data, error } = await rpc("portal_election_rpc", { p_token: token(), p_name: name, p_args: args ?? {} });
  return { data: error ? null : data, error: error ? { message: error.message } : null };
}
