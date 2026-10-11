import { createClient } from "@supabase/supabase-js";

export function adminDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase server configuration missing");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function bearer(request: Request) {
  const match = /^Bearer (.+)$/i.exec(request.headers.get("authorization") || "");
  return match?.[1] || "";
}

export async function authenticatedUser(request: Request) {
  const token = bearer(request);
  if (!token) return null;
  const db = adminDb();
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user?.email || !data.user.email_confirmed_at) return null;
  return data.user;
}

export async function authorizedAdmin(request: Request) {
  const user = await authenticatedUser(request);
  if (!user) return null;
  const { data, error } = await adminDb().from("founding_50_admin_users")
    .select("user_id").eq("user_id", user.id).maybeSingle();
  return error || !data ? null : user;
}

export function safeError(error: unknown, fallback: string) {
  // Do not echo database exception text to untrusted callers.
  console.error("Founding 50 operation failed", error);
  return fallback;
}

export async function applicationForUser(userId: string) {
  const { data, error } = await adminDb().from("founding_50_applications")
    .select("id, student_name, beta_starts_at, beta_ends_at, survey_completed_at, status")
    .eq("account_user_id", userId).maybeSingle();
  if (error) throw error;
  return data;
}
