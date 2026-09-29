import "server-only";

import { createClient } from "@supabase/supabase-js";

export type CurriculumDeveloperApiRole = "admin" | "curriculum_lead";

export type CurriculumDeveloperApiActor = {
  user_id: string;
  role: CurriculumDeveloperApiRole;
};

export type CurriculumDeveloperApiAccessErrorCode =
  | "AUTH_REQUIRED"
  | "ACCESS_DENIED"
  | "AUTH_CONFIG_MISSING";

export class CurriculumDeveloperApiAccessError extends Error {
  readonly code: CurriculumDeveloperApiAccessErrorCode;
  readonly status: 401 | 403 | 500;

  constructor(
    code: CurriculumDeveloperApiAccessErrorCode,
    message: string,
    status: 401 | 403 | 500,
  ) {
    super(message);
    this.name = "CurriculumDeveloperApiAccessError";
    this.code = code;
    this.status = status;
  }
}

function normaliseRole(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
}

function readBearerToken(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  return authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
}

/**
 * Server-side defence-in-depth for Curriculum Developer API routes.
 *
 * The browser page already limits access, but an API endpoint that can spend
 * model tokens must independently verify the Supabase user and role. No service
 * role key is required: the request user's JWT is used to read their own profile.
 */
export async function requireCurriculumDeveloperApiAccess(
  request: Request,
): Promise<CurriculumDeveloperApiActor> {
  const token = readBearerToken(request);
  if (!token) {
    throw new CurriculumDeveloperApiAccessError(
      "AUTH_REQUIRED",
      "A signed-in Curriculum Developer session is required.",
      401,
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new CurriculumDeveloperApiAccessError(
      "AUTH_CONFIG_MISSING",
      "Supabase authentication is not configured for the Math Intelligence endpoint.",
      500,
    );
  }

  const client = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser(token);

  if (userError || !user) {
    throw new CurriculumDeveloperApiAccessError(
      "AUTH_REQUIRED",
      "The Curriculum Developer session is no longer valid.",
      401,
    );
  }

  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new CurriculumDeveloperApiAccessError(
      "ACCESS_DENIED",
      "Dreamscape could not verify Curriculum Developer access for this account.",
      403,
    );
  }

  const role = normaliseRole(profile?.role);
  if (role !== "admin" && role !== "curriculum_lead") {
    throw new CurriculumDeveloperApiAccessError(
      "ACCESS_DENIED",
      "Math Intelligence authoring is restricted to admin and curriculum lead accounts.",
      403,
    );
  }

  return {
    user_id: user.id,
    role,
  };
}
