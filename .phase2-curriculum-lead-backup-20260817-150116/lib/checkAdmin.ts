import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function checkAdminFromRequest(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      isAdmin: false,
      user: null,
      error: "Missing auth token",
    };
  }

  const token = authHeader.replace("Bearer ", "");

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    return {
      isAdmin: false,
      user: null,
      error: "Invalid auth token",
    };
  }

  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  const userEmail = data.user.email?.toLowerCase();

  if (!userEmail || !adminEmails.includes(userEmail)) {
    return {
      isAdmin: false,
      user: data.user,
      error: "Not an admin",
    };
  }

  return {
    isAdmin: true,
    user: data.user,
    error: null,
  };
}