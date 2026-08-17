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
function normaliseCurriculumRole(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/_/g, "-");
}

/**
 * Authorization for protected Curriculum Developer server routes.
 *
 * This deliberately does NOT replace checkAdminFromRequest().
 * Existing admin-only APIs keep their original authorization.
 *
 * Allowed here:
 * - an existing ADMIN_EMAILS administrator; or
 * - profiles.role = admin; or
 * - profiles.role = curriculum_lead
 */
export async function checkCurriculumDeveloperFromRequest(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      isCurriculumDeveloper: false,
      isAdmin: false,
      role: null,
      user: null,
      error: "Missing auth token",
    };
  }

  const token = authHeader.slice("Bearer ".length).trim();

  if (!token) {
    return {
      isCurriculumDeveloper: false,
      isAdmin: false,
      role: null,
      user: null,
      error: "Missing auth token",
    };
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    return {
      isCurriculumDeveloper: false,
      isAdmin: false,
      role: null,
      user: null,
      error: "Invalid auth token",
    };
  }

  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  const userEmail = data.user.email?.trim().toLowerCase() || "";
  const isAdminEmail =
    Boolean(userEmail) && adminEmails.includes(userEmail);

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError && !isAdminEmail) {
    return {
      isCurriculumDeveloper: false,
      isAdmin: false,
      role: null,
      user: data.user,
      error: "Could not verify curriculum developer role",
    };
  }

  const profileRole = normaliseCurriculumRole(profile?.role);
  const isAdmin = isAdminEmail || profileRole === "admin";
  const isCurriculumLead = profileRole === "curriculum-lead";
  const isCurriculumDeveloper = isAdmin || isCurriculumLead;

  return {
    isCurriculumDeveloper,
    isAdmin,
    role: isAdmin
      ? "admin"
      : isCurriculumLead
        ? "curriculum_lead"
        : profileRole || null,
    user: data.user,
    error: isCurriculumDeveloper
      ? null
      : "Not a curriculum developer",
  };
}
