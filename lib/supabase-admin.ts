import "server-only";

import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

let cachedAdminClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cachedAdminClient) {
    return cachedAdminClient;
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL is not configured.",
    );
  }

  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not configured.",
    );
  }

  cachedAdminClient = createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  return cachedAdminClient;
}

/*
 * Keep the existing `supabaseAdmin.from(...)` and
 * `supabaseAdmin.auth.admin...` calls working.
 *
 * The real Supabase client is created only when a webhook actually runs,
 * not while Next.js is collecting route data during `npm run build`.
 */
export const supabaseAdmin = new Proxy(
  {} as SupabaseClient,
  {
    get(_target, property) {
      const client = getSupabaseAdmin();
      const value = Reflect.get(
        client,
        property,
        client,
      );

      return typeof value === "function"
        ? value.bind(client)
        : value;
    },
  },
);
